import * as React from "react";
/** A maintainer update in the public feed: author, project, relative time, body, reactions. */
export interface FeedItemProps{
  author: string; authorAvatar?: string; project: string; projectLogo?: string;
  time: string; likes?: number; comments?: number; children?: React.ReactNode;
}
export declare function FeedItem(props: FeedItemProps): JSX.Element;
