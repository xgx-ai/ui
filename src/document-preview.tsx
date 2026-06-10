import type { JSX } from "@solidjs/web";
import { Show } from "solid-js";
import { Box, Flex, Stack, Text } from "./layout/stack.tsx";

export interface DocumentPreviewShellProps {
  children: JSX.Element;
}

export function DocumentPreviewShell(props: DocumentPreviewShellProps) {
  return (
    <Box
      style={{
        width: "210mm",
        "min-height": "297mm",
        margin: "0 auto",
      }}
      class="bg-surface text-surface-foreground shadow-elevation-high"
    >
      {props.children}
    </Box>
  );
}

export interface DocumentPreviewHeaderProps {
  logo?: string | null;
  companyName?: string | null;
  documentLabel: string;
  documentNumberLabel: string;
  documentNumber?: string | null;
  documentNumberFallback?: string;
}

export function DocumentPreviewHeader(props: DocumentPreviewHeaderProps) {
  const companyDisplayName = () => props.companyName || "Organisation";
  const documentNumber = () => props.documentNumber || props.documentNumberFallback || null;

  return (
    <Flex
      justify="between"
      align="start"
      class="bg-surface-raised text-surface-raised-foreground px-10 py-8"
    >
      <Stack gap="0">
        <Show when={props.logo}>
          <img src={props.logo!} alt="Organisation logo" class="h-10 object-contain mb-3" />
        </Show>
        <Text as="div" class="text-xl font-semibold tracking-tight">
          {companyDisplayName()}
        </Text>
        <Text
          as="div"
          class="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mt-1"
        >
          {props.documentLabel}
        </Text>
      </Stack>
      <Show when={documentNumber()}>
        <Stack gap="0" class="text-right">
          <Text
            as="div"
            class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
          >
            {props.documentNumberLabel}
          </Text>
          <Text as="div" class="text-lg font-semibold">
            {documentNumber()}
          </Text>
        </Stack>
      </Show>
    </Flex>
  );
}

export interface DocumentPreviewStatusBarProps {
  statusLabel: string;
  children: JSX.Element;
}

export function DocumentPreviewStatusBar(props: DocumentPreviewStatusBarProps) {
  return (
    <Flex
      justify="between"
      align="center"
      class="px-10 py-3 bg-info text-info-foreground border-b border-border-subtle"
    >
      <Flex align="center" gap="2">
        <Box class="w-2 h-2 rounded-full bg-info-foreground" />
        <Text as="div" class="text-[11px] font-semibold uppercase tracking-wider">
          {props.statusLabel}
        </Text>
      </Flex>
      {props.children}
    </Flex>
  );
}

export interface DocumentPreviewPartyProps {
  title: string;
  name: string;
  children: JSX.Element;
}

export function DocumentPreviewParty(props: DocumentPreviewPartyProps) {
  return (
    <Stack gap="0">
      <Text
        as="div"
        class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2"
      >
        {props.title}
      </Text>
      <Text as="div" class="text-base font-semibold mb-1">
        {props.name}
      </Text>
      <Stack gap="0" class="text-[13px] leading-relaxed text-muted-foreground">
        {props.children}
      </Stack>
    </Stack>
  );
}
