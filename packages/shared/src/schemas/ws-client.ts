import { z } from 'zod';

const ChannelSchema = z.string().min(1);

export const SubscribeMessageSchema = z.object({
  type: z.literal('subscribe'),
  channels: z.array(ChannelSchema).min(1).max(20),
});

export const UnsubscribeMessageSchema = z.object({
  type: z.literal('unsubscribe'),
  channels: z.array(ChannelSchema).min(1).max(20),
});

export const WSClientMessageSchema = z.discriminatedUnion('type', [
  SubscribeMessageSchema,
  UnsubscribeMessageSchema,
]);

export type SubscribeMessage = z.infer<typeof SubscribeMessageSchema>;
export type UnsubscribeMessage = z.infer<typeof UnsubscribeMessageSchema>;
export type WSClientMessage = z.infer<typeof WSClientMessageSchema>;
