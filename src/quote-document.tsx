import { Index, Show } from "solid-js";
import {
  DocumentPreviewHeader,
  DocumentPreviewParty,
  DocumentPreviewShell,
  DocumentPreviewStatusBar,
} from "./document-preview.tsx";
import { Box, Flex, Text } from "./layout/stack.tsx";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  return `£${value.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const frequencyLabels: Record<string, string> = {
  one_off: "",
  monthly: "/month",
  quarterly: "/quarter",
  annually: "/year",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  sent: "Awaiting Acceptance",
  viewed: "Viewed",
  accepted: "Accepted",
  declined: "Declined",
};

const paymentTermsLabels: Record<string, string> = {
  net_7: "Net 7 days",
  net_14: "Net 14 days",
  net_30: "Net 30 days",
  net_60: "Net 60 days",
  eom: "End of month",
  due_on_receipt: "Due on receipt",
};

function resolvePaymentTermsLabel(
  terms: { type: string; customText?: string } | null | undefined,
): string | null {
  if (!terms) return null;
  if (terms.type === "custom") return terms.customText ?? "Custom";
  return paymentTermsLabels[terms.type] ?? null;
}

function isVatRegistered(vatNumber?: string | null): boolean {
  return Boolean(vatNumber?.trim());
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface QuoteDocumentSeller {
  name?: string | null;
  logo?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  postcode?: string | null;
  phone?: string | null;
  email?: string | null;
  vatNumber?: string | null;
}

export interface QuoteDocumentClient {
  name?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  county?: string | null;
  postcode?: string | null;
  faoName?: string | null;
  clientReference?: string | null;
}

export interface QuoteDocumentLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  billingFrequency: string;
}

export interface QuoteDocumentSpreadTotals {
  contractLineTotals: Array<{ contractTotal: number }>;
  monthlyNet: number;
  monthlyVat: number;
  monthlyGross: number;
}

export interface QuoteDocumentProps {
  seller: QuoteDocumentSeller;
  client: QuoteDocumentClient;

  quoteNumber?: string | null;
  status?: string | null;
  sentAt?: string | Date | null;
  validUntil?: string | Date | null;
  introMessage?: string | null;
  notes?: string | null;
  paymentTerms?: { type: string; customText?: string } | null;
  priceMode?: string | null;

  discountPercent?: number;
  discountFixed?: number;
  subtotal: number;
  vatTotal: number;
  grandTotal: number;

  /** Display subtotal — for inclusive mode this is the gross line total */
  displaySubtotal?: number;
  /** Display discount — for inclusive mode this is gross - grand */
  displayDiscount?: number;

  lineItems: QuoteDocumentLineItem[];

  spreadPayments?: boolean;
  contractLengthMonths?: number | null;
  spreadTotals?: QuoteDocumentSpreadTotals | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuoteDocument(props: QuoteDocumentProps) {
  const statusLabel = () => statusLabels[props.status ?? "draft"] ?? "Draft";
  const sellerVatRegistered = () => isVatRegistered(props.seller.vatNumber);

  const isInclusive = () => props.priceMode === "inclusive";
  const isExclusive = () => props.priceMode === "exclusive";

  const sentAtFormatted = () => {
    if (!props.sentAt) return null;
    return new Date(props.sentAt).toLocaleDateString("en-GB");
  };
  const today = () => new Date().toLocaleDateString("en-GB");
  const issuedDate = () => sentAtFormatted() ?? today();

  const validUntilFormatted = () => {
    if (!props.validUntil) return null;
    return new Date(props.validUntil).toLocaleDateString("en-GB");
  };

  const paymentTermsLabel = () => resolvePaymentTermsLabel(props.paymentTerms);

  const grossLineTotal = () =>
    props.lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

  const effectiveSubtotal = () =>
    props.displaySubtotal ??
    (isInclusive() ? grossLineTotal() : props.subtotal);

  const effectiveDiscount = () =>
    props.displayDiscount ??
    (isInclusive()
      ? Math.max(0, grossLineTotal() - props.grandTotal)
      : (() => {
          const percent = props.discountPercent ?? 0;
          const fixed = props.discountFixed ?? 0;
          if (percent > 0) return props.subtotal * (percent / 100);
          return fixed;
        })());

  return (
    <DocumentPreviewShell>
      <DocumentPreviewHeader
        logo={props.seller.logo}
        companyName={props.seller.name}
        documentLabel="Quote"
        documentNumberLabel="Quote No."
        documentNumber={props.quoteNumber}
      />
      <DocumentPreviewStatusBar statusLabel={statusLabel()}>
        <Text as="div" class="text-[13px] text-muted-foreground">
          Issued{" "}
          <Text as="span" class="font-semibold text-foreground">
            {issuedDate()}
          </Text>
          <Show when={validUntilFormatted()}>
            {" \u00B7 Valid until "}
            <Text as="span" class="font-semibold text-foreground">
              {validUntilFormatted()}
            </Text>
          </Show>
        </Text>
      </DocumentPreviewStatusBar>

      {/* Body */}
      <Box class="px-10 py-8">
        {/* Parties — From / Prepared For */}
        <Box class="grid grid-cols-2 gap-10 mb-8">
          <DocumentPreviewParty
            title="From"
            name={props.seller.name || "Company Name"}
          >
            <>
              <Show when={props.seller.addressLine1}>
                <Text as="div">{props.seller.addressLine1}</Text>
              </Show>
              <Show when={props.seller.addressLine2}>
                <Text as="div">{props.seller.addressLine2}</Text>
              </Show>
              <Show when={props.seller.city || props.seller.postcode}>
                <Text as="div">
                  {[props.seller.city, props.seller.postcode]
                    .filter(Boolean)
                    .join(", ")}
                </Text>
              </Show>
              <Show when={props.seller.phone || props.seller.email}>
                <Text as="div">
                  {[props.seller.phone, props.seller.email]
                    .filter(Boolean)
                    .join(" / ")}
                </Text>
              </Show>
              <Show
                when={sellerVatRegistered() && props.seller.vatNumber}
                fallback={<Text as="div">Not VAT registered</Text>}
              >
                <Text as="div">VAT: {props.seller.vatNumber}</Text>
              </Show>
            </>
          </DocumentPreviewParty>

          <DocumentPreviewParty
            title="Prepared For"
            name={props.client.name || "Client Name"}
          >
            <>
              <Show when={props.client.addressLine1}>
                <Text as="div">{props.client.addressLine1}</Text>
              </Show>
              <Show when={props.client.addressLine2}>
                <Text as="div">{props.client.addressLine2}</Text>
              </Show>
              <Show when={props.client.city || props.client.county}>
                <Text as="div">
                  {[props.client.city, props.client.county]
                    .filter(Boolean)
                    .join(", ")}
                </Text>
              </Show>
              <Show when={props.client.postcode}>
                <Text as="div">{props.client.postcode}</Text>
              </Show>
              <Show when={props.client.faoName}>
                <Text as="div" class="mt-1">
                  FAO: {props.client.faoName}
                </Text>
              </Show>
              <Show when={props.client.clientReference}>
                <Text as="div">Ref: {props.client.clientReference}</Text>
              </Show>
            </>
          </DocumentPreviewParty>
        </Box>

        {/* Intro / scope */}
        <Show when={props.introMessage}>
          <Text
            as="div"
            class="text-sm leading-relaxed text-muted-foreground mb-8 max-w-xl whitespace-pre-wrap"
          >
            {props.introMessage}
          </Text>
        </Show>

        {/* Line items */}
        <Show
          when={props.lineItems.length > 0}
          fallback={
            <Box class="border border-dashed border-gray-200 rounded-lg p-6 text-center mb-8">
              <Text as="div" class="text-sm text-muted-foreground">
                Add line items to preview
              </Text>
            </Box>
          }
        >
          <table class="w-full mb-0">
            <thead>
              <tr class="border-b-2 border-gray-900">
                <th class="text-left py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Description
                </th>
                <th class="text-center py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-20">
                  Qty
                </th>
                <th class="text-right py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-24">
                  Rate
                </th>
                <Show when={isExclusive()}>
                  <th class="text-right py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-16">
                    VAT
                  </th>
                </Show>
                <th class="text-right py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-28">
                  Amount
                </th>
                <Show when={props.contractLengthMonths}>
                  <th class="text-right py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground w-28">
                    Contract Total
                  </th>
                </Show>
              </tr>
            </thead>
            <tbody>
              <Index each={props.lineItems}>
                {(item, index) => {
                  const lineAmount = () =>
                    Number(item().quantity) * Number(item().unitPrice);
                  const freq = () =>
                    frequencyLabels[item().billingFrequency] ?? "";
                  const isLast = () => index === props.lineItems.length - 1;
                  return (
                    <tr
                      class={
                        isLast()
                          ? "border-b-2 border-gray-900"
                          : "border-b border-gray-200"
                      }
                    >
                      <td class="py-3 align-top">
                        <Text as="div" class="text-sm font-semibold">
                          {item().description || "Untitled item"}
                        </Text>
                        <Show when={freq()}>
                          <Text
                            as="div"
                            class="text-xs text-muted-foreground mt-0.5"
                          >
                            {freq()}
                          </Text>
                        </Show>
                      </td>
                      <td class="text-center py-3 text-sm text-muted-foreground align-top">
                        {Number(item().quantity)}
                      </td>
                      <td class="text-right py-3 text-sm text-muted-foreground align-top">
                        {formatCurrency(Number(item().unitPrice))}
                      </td>
                      <Show when={isExclusive()}>
                        <td class="text-right py-3 text-sm text-muted-foreground align-top">
                          {Number(item().vatRate)}%
                        </td>
                      </Show>
                      <td class="text-right py-3 text-sm font-semibold align-top">
                        {formatCurrency(lineAmount())}
                      </td>
                      <Show when={props.spreadTotals}>
                        {(spread) => (
                          <td class="text-right py-3 text-sm font-semibold align-top">
                            {formatCurrency(
                              spread().contractLineTotals[index]
                                ?.contractTotal ?? lineAmount(),
                            )}
                          </td>
                        )}
                      </Show>
                    </tr>
                  );
                }}
              </Index>
            </tbody>
          </table>

          {/* Totals */}
          <Flex justify="end" class="mt-0 mb-8">
            <Box class="w-64">
              <Flex
                justify="between"
                class="py-2 text-sm text-muted-foreground border-b border-gray-200"
              >
                <Text as="span" class="font-medium">
                  Subtotal
                </Text>
                <Text as="span" class="font-semibold">
                  {formatCurrency(effectiveSubtotal())}
                </Text>
              </Flex>
              <Show when={effectiveDiscount() > 0}>
                <Flex justify="between" class="py-2 text-sm text-green-700">
                  <Text as="span" class="font-medium">
                    Discount
                    <Show when={(props.discountPercent ?? 0) > 0}>
                      {" "}
                      ({props.discountPercent}%)
                    </Show>
                  </Text>
                  <Text as="span" class="font-semibold">
                    -{formatCurrency(effectiveDiscount())}
                  </Text>
                </Flex>
              </Show>
              <Show
                when={
                  isExclusive() && sellerVatRegistered() && props.vatTotal > 0
                }
              >
                <Flex
                  justify="between"
                  class="py-2 text-sm text-muted-foreground border-b border-gray-200"
                >
                  <Text as="span" class="font-medium">
                    VAT
                  </Text>
                  <Text as="span" class="font-semibold">
                    {formatCurrency(props.vatTotal)}
                  </Text>
                </Flex>
              </Show>
              <Show when={isInclusive()}>
                <Text as="div" class="pt-2 text-[11px] text-muted-foreground">
                  Prices include VAT
                </Text>
              </Show>
              <Flex justify="between" class="py-3 text-lg font-bold">
                <Text as="span">Total</Text>
                <Text as="span">{formatCurrency(props.grandTotal)}</Text>
              </Flex>
            </Box>
          </Flex>
        </Show>

        {/* Monthly Payment Summary */}
        <Show when={props.spreadPayments && props.spreadTotals}>
          {(spread) => (
            <Box class="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-6">
              <Text
                as="div"
                class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1"
              >
                Monthly Payment Summary
              </Text>
              <Text as="div" class="text-xs text-muted-foreground mb-4">
                {props.contractLengthMonths}-month contract
              </Text>
              <Flex
                justify="between"
                class="py-2 text-sm text-muted-foreground border-b border-gray-200"
              >
                <Text as="span" class="font-medium">
                  Monthly net
                </Text>
                <Text as="span" class="font-semibold">
                  {formatCurrency(spread().monthlyNet)}
                </Text>
              </Flex>
              <Flex
                justify="between"
                class="py-2 text-sm text-muted-foreground border-b border-gray-200"
              >
                <Text as="span" class="font-medium">
                  VAT
                </Text>
                <Text as="span" class="font-semibold">
                  {formatCurrency(spread().monthlyVat)}
                </Text>
              </Flex>
              <Flex justify="between" class="py-3 text-lg font-bold">
                <Text as="span">Monthly payment</Text>
                <Text as="span">{formatCurrency(spread().monthlyGross)}</Text>
              </Flex>
            </Box>
          )}
        </Show>

        {/* Payment terms card */}
        <Show when={paymentTermsLabel()}>
          {(label) => (
            <Box class="bg-gray-50 rounded-xl p-6 mb-6">
              <Text
                as="div"
                class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3"
              >
                Payment Terms
              </Text>
              <Text as="div" class="text-sm font-semibold">
                {label()}
              </Text>
            </Box>
          )}
        </Show>

        {/* Notes */}
        <Show when={props.notes}>
          <Text
            as="div"
            class="text-[13px] leading-relaxed text-muted-foreground whitespace-pre-wrap"
          >
            <Text as="span" class="font-semibold text-foreground">
              Notes:{" "}
            </Text>
            {props.notes}
          </Text>
        </Show>
      </Box>
    </DocumentPreviewShell>
  );
}
