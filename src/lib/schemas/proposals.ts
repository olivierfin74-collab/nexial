import { z } from "zod";

export const actionMetadataSchema = z
  .object({
    surface: z.enum(["mobile", "desktop"]),
    source_button_id: z.string().min(1).max(50),
    source_page: z.string().max(50).optional(),
  })
  .optional();

export const acceptSchema = z.object({
  proposal_ids: z.array(z.string().uuid()).min(1).max(10),
  action_metadata: actionMetadataSchema,
});

export const modifySchema = z.object({
  proposal_id: z.string().uuid(),
  patch: z
    .object({
      user_price: z.number().positive().optional(),
      user_quantity: z.number().positive().optional(),
      expires_at: z.string().datetime().optional(),
      user_note: z.string().max(500).optional(),
    })
    .refine(
      (d) => Object.keys(d).length > 0,
      "patch must have at least one field"
    ),
  action_metadata: actionMetadataSchema,
});

export const cancelSchema = z.object({
  proposal_id: z.string().uuid(),
  reason: z.string().max(500).optional(),
  action_metadata: actionMetadataSchema,
});

export type ActionMetadata = z.infer<typeof actionMetadataSchema>;
export type AcceptInput = z.infer<typeof acceptSchema>;
export type ModifyInput = z.infer<typeof modifySchema>;
export type CancelInput = z.infer<typeof cancelSchema>;

export type AcceptData = {
  ok: true;
  accepted_count: number;
  accepted_ids: string[];
  skipped: Array<{
    id: string;
    reason: "NOT_FOUND" | "INVALID_STATUS";
    current_status?: string;
  }>;
  at: string;
};

export type ModifyData = {
  ok: true;
  proposal_id: string;
  new_status: string;
  user_price: number | null;
  user_quantity: number | null;
  expires_at: string;
  user_note: string | null;
  at: string;
};

export type CancelData = {
  ok: true;
  proposal_id: string;
  new_status: "CANCELLED_BY_USER";
  previous_status: string;
  at: string;
};

export type ProposalApiError =
  | "UNKNOWN_ACTION"
  | "INVALID_JSON"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "AUTH_INTERNAL"
  | "VALIDATION"
  | "RPC_ERROR"
  | "INTERNAL"
  | "UNREACHABLE";
