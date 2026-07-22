"use client";

/**
 * MessageRow — thin adapter over MessageCard (Message Experience Engine).
 * Keeps existing ChatRoom / ThreadPanel call sites stable.
 */

import { MessageCard, type MessageCardProps } from "./message-engine/MessageCard";

export type MessageRowProps = MessageCardProps;

export function MessageRow(props: MessageRowProps) {
  return <MessageCard {...props} />;
}
