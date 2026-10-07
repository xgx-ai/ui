import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@xgx/ui";
import { createSignal } from "solid-js";

function Sections(props: {
  testId: string;
  defaultValue?: string[];
  value?: string[];
  onChange?: (value: string[]) => void;
}) {
  return (
    <Accordion
      data-testid={props.testId}
      multiple
      collapsible
      defaultValue={props.defaultValue}
      value={props.value}
      onChange={props.onChange}
    >
      <AccordionItem value="first">
        <AccordionTrigger>First section</AccordionTrigger>
        <AccordionContent>First section details</AccordionContent>
      </AccordionItem>
      <AccordionItem value="second">
        <AccordionTrigger>Second section</AccordionTrigger>
        <AccordionContent>Second section details</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function SingleSection(props: {
  value?: string | null;
  defaultValue?: string;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <Accordion
      data-testid="single-accordion"
      collapsible
      defaultValue={props.defaultValue}
      value={props.value}
      onChange={props.onChange}
    >
      <AccordionItem value="first">
        <AccordionTrigger>First section</AccordionTrigger>
        <AccordionContent>First section details</AccordionContent>
      </AccordionItem>
      <AccordionItem value="second">
        <AccordionTrigger>Second section</AccordionTrigger>
        <AccordionContent>Second section details</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export function AccordionDemo() {
  const [defaults, setDefaults] = createSignal(["first"]);
  const [controlled, setControlled] = createSignal(["first"]);
  const [single, setSingle] = createSignal<string | null | undefined>("first");
  return (
    <Card>
      <CardHeader>
        <CardTitle>Accordion state</CardTitle>
        <CardDescription>
          Default sections seed once; controlled sections follow parent updates.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <Button variant="outline" onClick={() => setDefaults(["second"])}>
          Change default section
        </Button>
        <Sections testId="default-accordion" defaultValue={defaults()} />
        <Button variant="outline" onClick={() => setControlled(["second"])}>
          Change controlled section
        </Button>
        <Sections testId="controlled-accordion" value={controlled()} onChange={setControlled} />
        <Button variant="outline" onClick={() => setControlled([])}>
          Clear controlled sections
        </Button>
        <SingleSection value={single()} defaultValue="second" onChange={setSingle} />
        <Button variant="outline" onClick={() => setSingle(undefined)}>
          Clear single section
        </Button>
        <Button variant="outline" onClick={() => setSingle(null)}>
          Close single section
        </Button>
      </CardContent>
    </Card>
  );
}
