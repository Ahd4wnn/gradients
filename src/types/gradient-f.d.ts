import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "gradient-f": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & { recipe?: string };
    }
  }
}
