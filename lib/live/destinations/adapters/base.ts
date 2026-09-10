import type {
  DestinationCapabilities,
  DestinationPlatform,
  EncryptedCredentialPayload,
  LiveMetadata,
  PreparedIngest,
} from "../types";

export type AdapterContext = {
  userId: string;
  destinationId: string;
  credentials: EncryptedCredentialPayload | null;
  metadata: LiveMetadata;
  displayName: string;
  providerAccountId?: string | null;
  providerChannelId?: string | null;
  providerPageId?: string | null;
};

export type AdapterResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; permanent?: boolean };

export interface DestinationAdapter {
  readonly platform: DestinationPlatform;
  readonly capabilities: DestinationCapabilities;

  validate(ctx: AdapterContext): Promise<AdapterResult<{ ok: true }>>;
  prepare(ctx: AdapterContext): Promise<AdapterResult<PreparedIngest>>;
  start(ctx: AdapterContext & { prepared: PreparedIngest }): Promise<AdapterResult<void>>;
  stop(ctx: AdapterContext & { prepared?: PreparedIngest | null }): Promise<AdapterResult<void>>;
  refreshCredentials?(
    ctx: AdapterContext
  ): Promise<AdapterResult<EncryptedCredentialPayload>>;
  getStatus?(ctx: AdapterContext): Promise<AdapterResult<{ status: string }>>;
  cleanup?(ctx: AdapterContext): Promise<void>;
}

export class ApprovalRequiredAdapter implements DestinationAdapter {
  constructor(
    readonly platform: DestinationPlatform,
    readonly capabilities: DestinationCapabilities,
    private readonly message: string
  ) {}

  async validate(): Promise<AdapterResult<{ ok: true }>> {
    return { ok: false, error: this.message, permanent: true };
  }
  async prepare(): Promise<AdapterResult<PreparedIngest>> {
    return { ok: false, error: this.message, permanent: true };
  }
  async start(): Promise<AdapterResult<void>> {
    return { ok: false, error: this.message, permanent: true };
  }
  async stop(): Promise<AdapterResult<void>> {
    return { ok: true, value: undefined };
  }
}
