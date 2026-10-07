import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { MAX_XML_BYTES, parseNfeXml } from "./domain";

const accessKey = "35261000000000000000550010000000011000000010";

function xml(overrides = "") {
  return `<?xml version="1.0"?><nfeProc xmlns="http://www.portalfiscal.inf.br/nfe"><NFe><infNFe Id="NFe${accessKey}"><ide><nNF>1</nNF><serie>2</serie><dhEmi>2026-10-01T10:30:00-03:00</dhEmi></ide><emit><CNPJ>12345678000195</CNPJ><xNome>Fornecedor Fictício</xNome></emit><det nItem="1"><prod><cProd>F-01</cProd><xProd>Produto de teste</xProd><uCom>CX</uCom><qCom>2.000</qCom><vUnCom>10.00</vUnCom><vProd>20.00</vProd></prod></det><total><ICMSTot><vNF>20.00</vNF></ICMSTot></total></infNFe></NFe><protNFe><infProt><chNFe>${accessKey}</chNFe></infProt></protNFe></nfeProc>${overrides}`;
}

describe("parseNfeXml", () => {
  it("should_parse_synthetic_fixtures_when_smoke_documents_are_well_formed", () => {
    const pharmacyXml = readFileSync(
      new URL(
        "../../../../tests/fixtures/fiscal-import/nfe-a-farmacia.xml",
        import.meta.url,
      ),
      "utf8",
    );
    const laboratoryXml = readFileSync(
      new URL(
        "../../../../tests/fixtures/fiscal-import/nfe-b-laboratorio.xml",
        import.meta.url,
      ),
      "utf8",
    );
    const duplicateXml = readFileSync(
      new URL(
        "../../../../tests/fixtures/fiscal-import/nfe-c-duplicada-farmacia.xml",
        import.meta.url,
      ),
      "utf8",
    );

    expect(parseNfeXml(pharmacyXml).items).toHaveLength(2);
    expect(parseNfeXml(laboratoryXml).items).toHaveLength(2);
    expect(parseNfeXml(duplicateXml).accessKey).toBe(
      parseNfeXml(pharmacyXml).accessKey,
    );
  });

  it("should_extract_invoice_fields_when_xml_uses_default_namespace", () => {
    expect(parseNfeXml(xml())).toMatchObject({
      accessKey,
      issuerName: "Fornecedor Fictício",
      invoiceNumber: "1",
      invoiceSeries: "2",
      orderDate: "2026-10-01",
      invoiceTotal: "20.00",
      items: [
        {
          itemNumber: "1",
          supplierCode: "F-01",
          description: "Produto de teste",
          unit: "CX",
          quantity: "2.000",
          unitPrice: "10.00",
          productTotal: "20.00",
        },
      ],
    });
  });

  it("should_parse_standalone_nfe_when_protocol_wrapper_is_absent", () => {
    const invoice = xml().match(/<NFe>[\s\S]*?<\/NFe>/)?.[0] ?? "";
    expect(parseNfeXml(invoice).accessKey).toBe(accessKey);
  });

  it("should_parse_prefixed_namespaces_when_xml_tags_use_an_arbitrary_prefix", () => {
    const prefixed = xml()
      .replace(
        'xmlns="http://www.portalfiscal.inf.br/nfe"',
        'xmlns:n="http://www.portalfiscal.inf.br/nfe"',
      )
      .replace(/<(\/?)((?!\?)[\w]+)/g, "<$1n:$2");
    expect(parseNfeXml(prefixed).accessKey).toBe(accessKey);
  });

  it("should_reject_invalid_missing_or_oversized_access_keys", () => {
    const missing = xml()
      .replace(` Id="NFe${accessKey}"`, "")
      .replace(/<protNFe>[\s\S]*?<\/protNFe>/, "");
    const invalid = xml().replace(`NFe${accessKey}`, "NFeinvalid");
    expect(() => parseNfeXml(missing)).toThrow(/chave de acesso/);
    expect(() => parseNfeXml(invalid)).toThrow(/chave de acesso/);
    expect(() => parseNfeXml(" ".repeat(MAX_XML_BYTES + 1))).toThrow(/5 MB/);
  });

  it("should_reject_more_than_one_hundred_items_when_invoice_exceeds_rpc_limit", () => {
    const detail = (item: number) =>
      `<det nItem="${item}"><prod><cProd>F-${item}</cProd><xProd>Produto ${item}</xProd><uCom>UN</uCom><qCom>1</qCom><vUnCom>1.00</vUnCom><vProd>1.00</vProd></prod></det>`;
    const manyItems = xml().replace(
      "</infNFe>",
      `${Array.from({ length: 100 }, (_, index) => detail(index + 2)).join("")}</infNFe>`,
    );
    expect(() => parseNfeXml(manyItems)).toThrow(/100 itens/);
  });

  it("should_keep_source_precision_for_manual_review_when_xml_exceeds_purchase_precision", () => {
    const highPrecision = xml()
      .replace("<qCom>2.000</qCom>", "<qCom>2.0004</qCom>")
      .replace("<vUnCom>10.00</vUnCom>", "<vUnCom>10.001</vUnCom>");
    expect(parseNfeXml(highPrecision).items[0]).toMatchObject({
      quantity: "2.0004",
      unitPrice: "10.001",
    });
  });

  it("should_reject_doctype_and_entity_when_xml_contains_unsafe_declarations", () => {
    expect(() => parseNfeXml(`<!DOCTYPE x [<!ENTITY e "x">]>${xml()}`)).toThrow(
      /DOCTYPE|ENTITY/,
    );
    expect(() => parseNfeXml(`<!ENTITY e "x">${xml()}`)).toThrow(
      /DOCTYPE|ENTITY/,
    );
  });

  it("should_reject_divergent_keys_when_protocol_differs_from_invoice", () => {
    expect(() =>
      parseNfeXml(
        xml().replace(
          `${accessKey}</chNFe>`,
          "35261000000000000000550010000000011000000011</chNFe>",
        ),
      ),
    ).toThrow(/divergentes/);
  });

  it("should_reject_duplicate_item_numbers_when_nItem_repeats", () => {
    const duplicateItem = xml().replace(
      "</infNFe>",
      '<det nItem="1"><prod><cProd>F-02</cProd><xProd>Outro</xProd><uCom>UN</uCom><qCom>1</qCom><vUnCom>1.00</vUnCom><vProd>1.00</vProd></prod></det></infNFe>',
    );
    expect(() => parseNfeXml(duplicateItem)).toThrow(/duplicados/);
  });

  it("should_reject_unrecognized_xml_when_invoice_structure_is_missing", () => {
    expect(() => parseNfeXml("<root><value>1</value></root>")).toThrow(
      /não reconhecida/,
    );
  });
});
