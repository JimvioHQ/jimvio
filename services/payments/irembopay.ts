import axios from "axios";

const IREMBOPAY_BASE_URL = "https://api.irembopay.com/v1";

interface IremboPayInitRequest {
  amount: number;
  currency?: string;
  orderId: string;
  description: string;
  customerEmail: string;
  customerPhone?: string;
  customerName?: string;
  callbackUrl: string;
  returnUrl: string;
  metadata?: Record<string, string>;
}

interface IremboPayResponse {
  success: boolean;
  data?: {
    transactionId: string;
    paymentUrl: string;
    reference: string;
    amount: number;
    currency: string;
    status: string;
    expiresAt: string;
  };
  error?: string;
}

interface IremboPayStatusResponse {
  success: boolean;
  data?: {
    transactionId: string;
    reference: string;
    status: "pending" | "completed" | "failed" | "cancelled";
    amount: number;
    currency: string;
    paidAt?: string;
    metadata?: Record<string, string>;
  };
  error?: string;
}

export class IremboPayService {
  private apiKey: string;
  private secretKey: string;

  constructor() {
    this.apiKey = process.env.IREMBOPAY_API_KEY || process.env.IREMBO_PAY_API_KEY || "";
    this.secretKey = process.env.IREMBOPAY_SECRET_KEY || process.env.IREMBO_PAY_SECRET || "";
  }

  private getHeaders() {
    return {
      "Content-Type": "application/json",
      "X-API-Key": this.apiKey,
      "X-Secret-Key": this.secretKey,
    };
  }

  async initializePayment(request: IremboPayInitRequest): Promise<IremboPayResponse> {
    try {
      const response = await axios.post(
        `${IREMBOPAY_BASE_URL}/payments/initialize`,
        {
          amount: request.amount,
          currency: request.currency || "RWF",
          orderId: request.orderId,
          description: request.description,
          customer: {
            email: request.customerEmail,
            phone: request.customerPhone,
            name: request.customerName,
          },
          callbackUrl: request.callbackUrl,
          returnUrl: request.returnUrl,
          metadata: request.metadata,
        },
        { headers: this.getHeaders() }
      );

      return { success: true, data: response.data };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return { success: false, error: error.response?.data?.message || "Payment initialization failed" };
      }
      return { success: false, error: "Unexpected error" };
    }
  }

  async getPaymentStatus(transactionId: string): Promise<IremboPayStatusResponse> {
    try {
      const response = await axios.get(
        `${IREMBOPAY_BASE_URL}/payments/${transactionId}/status`,
        { headers: this.getHeaders() }
      );
      return { success: true, data: response.data };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return { success: false, error: error.response?.data?.message || "Failed to get payment status" };
      }
      return { success: false, error: "Unexpected error" };
    }
  }

  async initiateVendorPayout(params: {
    amount: number;
    accountNumber: string;
    accountName: string;
    description: string;
    reference: string;
  }) {
    try {
      const response = await axios.post(
        `${IREMBOPAY_BASE_URL}/payouts/send`,
        {
          amount: params.amount,
          currency: "RWF",
          recipient: {
            accountNumber: params.accountNumber,
            accountName: params.accountName,
          },
          description: params.description,
          reference: params.reference,
        },
        { headers: this.getHeaders() }
      );
      return { success: true, data: response.data };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return { success: false, error: error.response?.data?.message || "Payout failed" };
      }
      return { success: false, error: "Unexpected error" };
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.secretKey || !signature) return false;
    const crypto = require("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", this.secretKey)
      .update(payload)
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  }
}

export const iremboPay = new IremboPayService();
