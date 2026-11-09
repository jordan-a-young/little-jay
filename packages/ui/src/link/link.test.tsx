import type { ComponentProps } from "react";
import { describe, expectTypeOf, it } from "vite-plus/test";
import type { ButtonVariant } from "../button/index.js";
import { ButtonLink, type ButtonLinkProps } from "../button-link/index.js";
import { Link, type LinkProps } from "./index.js";

describe("native navigation prop types", () => {
  it("requires a string href on both components", () => {
    expectTypeOf<Pick<LinkProps, "href">>().toEqualTypeOf<{ href: string }>();
    expectTypeOf<Pick<ButtonLinkProps, "href">>().toEqualTypeOf<{ href: string }>();
    expectTypeOf<ComponentProps<typeof Link>>().toEqualTypeOf<LinkProps>();
    expectTypeOf<ComponentProps<typeof ButtonLink>>().toEqualTypeOf<ButtonLinkProps>();
  });

  it("preserves native anchor props and the existing button variant union", () => {
    expectTypeOf<Omit<LinkProps, "href">>().toEqualTypeOf<Omit<ComponentProps<"a">, "href">>();
    expectTypeOf<Omit<ButtonLinkProps, "href" | "variant">>().toEqualTypeOf<
      Omit<ComponentProps<"a">, "href">
    >();
    expectTypeOf<ButtonLinkProps["variant"]>().toEqualTypeOf<ButtonVariant | undefined>();
  });

  it("does not introduce disabled/loading, router or polymorphic props", () => {
    type UnsupportedProps = "disabled" | "loading" | "as" | "asChild" | "to";
    expectTypeOf<Extract<UnsupportedProps, keyof LinkProps>>().toEqualTypeOf<never>();
    expectTypeOf<Extract<UnsupportedProps, keyof ButtonLinkProps>>().toEqualTypeOf<never>();
  });
});
