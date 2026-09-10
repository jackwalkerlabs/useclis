import * as React from "react";
/**
 * Bordered white surface — the single container primitive across the product.
 * @startingPoint section="Core" subtitle="Card surface with interactive lift" viewport="700x200"
 */
export interface CardProps extends React.HTMLAttributes<HTMLElement>{
  as?: React.ElementType;
  href?: string; target?: React.HTMLAttributeAnchorTarget; rel?: string;
  padding?: "none"|"sm"|"md"|"lg";
  /** Adds hover lift + shadow. Use for clickable listing cards. */
  interactive?: boolean;
  /** Optional custom card background. */
  accentBg?: string;
}
export declare function Card(props: CardProps): React.JSX.Element;
