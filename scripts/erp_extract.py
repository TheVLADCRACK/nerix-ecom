"""Extrait les données saisies du classeur NERIX ERP E-com (.xlsx) vers data-private/erp.json.

Bibliothèque standard uniquement. Lecture seule du classeur. Seules les colonnes saisies sont extraites :
les colonnes calculées (coûts, marges, stocks restants, rapports) sont recalculées par l'application.
Usage : python3 -I scripts/erp_extract.py "<chemin du .xlsx>"
Le fichier produit contient des données personnelles (téléphones) : il reste hors Git (data-private/).
"""
import datetime
import json
import re
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main", "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}


def col_idx(ref):
    n = 0
    for ch in re.match(r"[A-Z]+", ref).group(0):
        n = n * 26 + ord(ch) - 64
    return n - 1


def read(path):
    z = zipfile.ZipFile(path)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS):
            shared.append("".join(t.text or "" for t in si.iter("{%s}t" % NS["m"])))
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = {r.get("Id"): r.get("Target") for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))}
    out = {}
    for s in wb.find("m:sheets", NS):
        target = rels[s.get("{%s}id" % NS["r"])]
        target = target if target.startswith("xl/") else "xl/" + target.lstrip("/")
        rows = []
        for row in ET.fromstring(z.read(target)).iter("{%s}row" % NS["m"]):
            vals = {}
            for c in row.findall("m:c", NS):
                t, v = c.get("t"), c.find("m:v", NS)
                if t == "s" and v is not None:
                    val = shared[int(v.text)]
                elif t == "inlineStr":
                    val = "".join(x.text or "" for x in c.iter("{%s}t" % NS["m"]))
                else:
                    val = v.text if v is not None else None
                if val not in (None, ""):
                    vals[col_idx(c.get("r"))] = val
            rows.append([vals.get(i) for i in range(max(vals) + 1)] if vals else [])
        out[s.get("name")] = rows
    return out


def table(rows, header_row=2):
    """Lignes de données sous l'en-tête (ligne 3 du classeur), arrêtées à la première ligne sans identifiant."""
    hdr = rows[header_row]
    data = []
    for r in rows[header_row + 1:]:
        if not r or not r[0] or not str(r[0]).strip():
            continue
        data.append({h: (r[i] if i < len(r) else None) for i, h in enumerate(hdr) if h})
    return data


def day(v):
    return (datetime.date(1899, 12, 30) + datetime.timedelta(days=int(float(v)))).isoformat() if v not in (None, "", "0") else None


def num(v):
    try:
        return round(float(v), 4) if v not in (None, "") else 0
    except ValueError:
        return 0


def phone(v):
    d = re.sub(r"\D", "", str(v or ""))
    if d.startswith("237") and len(d) == 12:
        d = d[3:]
    return f"+237{d}" if re.fullmatch(r"[26]\d{8}", d) else None


def text(v):
    v = (v or "").strip() if isinstance(v, str) else v
    return None if v in (None, "", "0") else v


def main(src):
    s = read(src)
    p = {r[1]: r[2] for r in s["02 - PARAMETRES"][3:9] if len(r) > 2 and r[1]}
    lists_hdr = s["02 - PARAMETRES"][11]
    lists = {}
    for i, name in enumerate(lists_hdr):
        if name:
            lists[name] = [r[i] for r in s["02 - PARAMETRES"][12:] if i < len(r) and r[i]]

    products = [{
        "id": r["ID produit"], "sku": r["Référence / SKU"], "name": r["Nom du produit"], "category": r["Catégorie"], "supplier": r["Fournisseur"],
        "purchaseDate": day(r["Date d'achat"]), "quantity": num(r["Quantité achetée"]), "unitPrice": num(r["Prix d'achat unitaire"]),
        "fees": {"transport": num(r["Frais transport"]), "customs": num(r["Frais douane"]), "shipping": num(r["Frais expédition"]),
                 "packaging": num(r["Frais emballage"]), "bank": num(r["Frais bancaires"]), "other": num(r["Autres frais"])},
        "lowStockThreshold": num(r["Seuil stock faible"]) or num(p.get("Seuil de stock faible (par défaut)")),
    } for r in table(s["03 - PRODUITS"]) if r.get("Nom du produit")]

    movements = [{"id": r["ID mouvement"], "date": day(r["Date"]), "product": r["Produit"], "type": r["Type de mouvement"], "quantity": num(r["Quantité"])}
                 for r in table(s["04 - STOCK"]) if r.get("Produit")]

    orders = [{
        "id": r["ID commande"], "date": day(r["Date commande"]), "customerName": text(r["Client"]), "phone": phone(r["Téléphone"]), "phoneRaw": r["Téléphone"],
        "city": r["Ville"], "place": text(r["Lieu de livraison"]), "product": r["Produit"], "quantity": num(r["Quantité"]),
        "unitPrice": num(r["Prix unitaire vente"]), "discount": num(r["Remise"]), "partner": text(r["Partenaire livraison"]),
        "deliveryFee": num(r["Frais livraison"]), "deliveryDate": day(r["Date livraison"]), "status": r["Statut"],
        "cancelReason": text(r.get("Motif annulation")), "note": text(r.get("Observation")),
    } for r in table(s["05 - COMMANDES"]) if str(r.get("ID commande", "")).startswith("NERX") and r.get("Produit")]

    campaigns = [{
        "id": r["ID campagne"], "date": day(r["Date"]), "platform": r["Plateforme"], "name": text(r["Campagne"]), "products": text(r["Produit"]),
        "cities": text(r["Ville ciblée"]), "spend": num(r["Dépense (devise)"]), "currency": r["Devise"], "rate": num(r["Taux de change"]),
        "visits": num(r["Visites"]), "orders": num(r["Commandes"]), "deliveredOrders": num(r["Commandes livrées"]), "attributedRevenue": num(r["CA attribué"]),
        "note": text(r.get("Observation")),
    } for r in table(s["08 - PUBLICITE"]) if r.get("Plateforme")]

    charges = [{
        "id": r["ID charge"], "date": day(r["Date"]), "category": r["Catégorie"], "description": text(r["Description"]), "amount": num(r["Montant"]),
        "periodicity": text(r["Périodicité"]), "paymentMethod": text(r["Mode de paiement"]),
        "includedInProductCost": (r.get("Inclus dans coût de revient produit") or "Non") == "Oui", "note": text(r.get("Observation")),
    } for r in table(s["09 - CHARGES"]) if r.get("Montant")]

    losses = [{"id": r["ID perte"], "date": day(r["Date"]), "product": r["Produit"], "quantity": num(r["Quantité"]), "reason": r["Motif"], "note": text(r.get("Observation"))}
              for r in table(s["11 - PERTES"]) if r.get("Produit")]

    employees = [{
        "id": r["ID employé"], "name": r["Nom"], "role": text(r["Fonction"]), "phone": phone(r["Téléphone"]), "hiredOn": day(r["Date d'embauche"]),
        "monthlySalary": num(r["Salaire mensuel"]), "status": text(r["Statut"]), "lastPaymentDate": day(r.get("Date de paiement")),
        "lastPaymentAmount": num(r.get("Montant payé")), "note": text(r.get("Observation")),
    } for r in table(s["10 - EMPLOYES"]) if r.get("Nom")]

    out = {
        "source": Path(src).name,
        "extractedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
        "settings": {
            "company": p.get("Nom de l'entreprise"), "currency": "XAF", "eurRate": num(p.get("Taux EUR / FCFA")),
            "fiscalYear": int(num(p.get("Année comptable"))), "lowStockThreshold": num(p.get("Seuil de stock faible (par défaut)")),
            "taxRate": num(p.get("Taux d'impôt (bénéfice)")), "lists": lists,
        },
        "products": products, "stockMovements": movements, "orders": orders, "campaigns": campaigns,
        "charges": charges, "losses": losses, "employees": employees,
    }
    dest = Path(__file__).resolve().parent.parent / "data-private" / "erp.json"
    dest.parent.mkdir(exist_ok=True)
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=1))
    bad = [o["id"] for o in orders if not o["phone"]]
    print(f"{len(products)} lots produits, {len(movements)} mouvements, {len(orders)} commandes, {len(campaigns)} campagnes, "
          f"{len(charges)} charges, {len(losses)} pertes, {len(employees)} employés -> {dest}")
    if bad:
        print("Téléphones non normalisés :", bad)


if __name__ == "__main__":
    main(sys.argv[1])
