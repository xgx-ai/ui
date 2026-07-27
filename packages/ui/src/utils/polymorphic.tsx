import type { ComponentProps, ValidComponent } from "@solidjs/web";
import { Dynamic } from "@solidjs/web";
import { omit } from "solid-js";

export type PolymorphicProps<T extends ValidComponent, Props extends object = {}> = Props &
  Omit<ComponentProps<T>, keyof Props | "as"> & {
    as?: T;
  };

type PolymorphicElementProps<T extends ValidComponent = "div"> = PolymorphicProps<
  T,
  { class?: string | undefined }
>;

export const PolymorphicElement = <T extends ValidComponent = "div">(
  props: PolymorphicElementProps<T>,
) => {
  const local = props;
  const others = omit(props, "as");
  return <Dynamic component={local.as ?? "div"} {...others} />;
};
