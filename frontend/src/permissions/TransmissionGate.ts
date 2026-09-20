/**
 * Music Mirror — Data Transmission Gate (Spec §15)
 * Version: 2.04.04.0
 *
 * Enforces strict architectural privacy boundaries before any payload is
 * transmitted to any external service or internal network endpoint.
 *
 * Rules:
 * 1. Provider validation: Destination must exist and be active in ProviderRegistry.
 * 2. Sensitive Context prohibition: SENSITIVE_CONTEXT fields (raw frames, audio PCM,
 *    biometrics) are PERMANENTLY BLOCKED from transmission under all conditions.
 * 3. Consent enforcement: PERSONAL_DATA and USER_DATA require explicit consent in ConsentRecord.
 * 4. Zero-PII Audit: All transmission attempts are logged with field names and classifications only;
 *    zero payload data or PII is ever retained in logs.
 */

import {
  DataClass,
  classifyField,
  requiresConsentForTransmission,
} from './DataClassifier';
import { isProviderRegistered, getProvider } from './ProviderRegistry';
import { hasConsent } from './ConsentRecord';

// ---------------------------------------------------------------------------
// Error Classes
// ---------------------------------------------------------------------------

export class PrivacyViolationError extends Error {
  public readonly fieldKey: string;
  public readonly dataClass: DataClass;

  constructor(message: string, fieldKey: string, dataClass: DataClass) {
    super(message);
    this.name = 'PrivacyViolationError';
    this.fieldKey = fieldKey;
    this.dataClass = dataClass;
  }
}

export class UnapprovedProviderError extends Error {
  public readonly providerId: string;

  constructor(message: string, providerId: string) {
    super(message);
    this.name = 'UnapprovedProviderError';
    this.providerId = providerId;
  }
}

export class ConsentRequiredError extends Error {
  public readonly fieldKey: string;
  public readonly purpose: string;

  constructor(message: string, fieldKey: string, purpose: string) {
    super(message);
    this.name = 'ConsentRequiredError';
    this.fieldKey = fieldKey;
    this.purpose = purpose;
  }
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface TransmissionRequest {
  destinationProviderId: string;
  fieldKeys: string[];
  purpose?: string;
}

export interface TransmissionEvaluation {
  allowed: boolean;
  reason?: string;
  blockedFields: string[];
  allowedFields: string[];
  violationClass?: DataClass;
  requiresConsent: boolean;
}

export interface TransmissionAuditEvent {
  timestamp: string;
  destinationProviderId: string;
  allowed: boolean;
  blockedCount: number;
  allowedCount: number;
  violationReason?: string;
  blockedFields: string[];
}

// ---------------------------------------------------------------------------
// In-Memory Audit Trail (Zero PII - Only Field Keys & Metrics)
// ---------------------------------------------------------------------------

const MAX_AUDIT_LOG_SIZE = 100;
const _auditLog: TransmissionAuditEvent[] = [];

function recordAuditEvent(event: TransmissionAuditEvent): void {
  _auditLog.push(event);
  if (_auditLog.length > MAX_AUDIT_LOG_SIZE) {
    _auditLog.shift();
  }
}

export function getTransmissionAuditLog(): readonly TransmissionAuditEvent[] {
  return [..._auditLog];
}

export function clearTransmissionAuditLog(): void {
  _auditLog.length = 0;
}

// ---------------------------------------------------------------------------
// Transmission Gate Evaluation & Enforcement
// ---------------------------------------------------------------------------

/**
 * Evaluates whether the requested fields are permitted to be transmitted to the destination provider.
 */
export function evaluateTransmission(req: TransmissionRequest): TransmissionEvaluation {
  const { destinationProviderId, fieldKeys, purpose } = req;

  // 1. Destination Provider Verification
  if (!isProviderRegistered(destinationProviderId)) {
    const reason = `Destination provider '${destinationProviderId}' is not registered in ProviderRegistry.`;
    recordAuditEvent({
      timestamp: new Date().toISOString(),
      destinationProviderId,
      allowed: false,
      blockedCount: fieldKeys.length,
      allowedCount: 0,
      violationReason: reason,
      blockedFields: [...fieldKeys],
    });

    return {
      allowed: false,
      reason,
      blockedFields: [...fieldKeys],
      allowedFields: [],
      requiresConsent: false,
    };
  }

  const provider = getProvider(destinationProviderId);
  if (provider && !provider.active) {
    const reason = `Destination provider '${destinationProviderId}' is currently inactive.`;
    recordAuditEvent({
      timestamp: new Date().toISOString(),
      destinationProviderId,
      allowed: false,
      blockedCount: fieldKeys.length,
      allowedCount: 0,
      violationReason: reason,
      blockedFields: [...fieldKeys],
    });

    return {
      allowed: false,
      reason,
      blockedFields: [...fieldKeys],
      allowedFields: [],
      requiresConsent: false,
    };
  }

  const blockedFields: string[] = [];
  const allowedFields: string[] = [];
  let violationClass: DataClass | undefined;
  let violationReason: string | undefined;
  let requiresConsentFlag = false;

  for (const field of fieldKeys) {
    const classification = classifyField(field);

    // If field is unclassified, treat as potential security risk (block by default)
    if (!classification) {
      blockedFields.push(field);
      violationReason = `Field '${field}' is not registered in DataClassifier.`;
      continue;
    }

    // Rule 1: SENSITIVE_CONTEXT can NEVER be transmitted anywhere
    if (classification === DataClass.SENSITIVE_CONTEXT) {
      blockedFields.push(field);
      violationClass = DataClass.SENSITIVE_CONTEXT;
      violationReason = `Transmission of SENSITIVE_CONTEXT field '${field}' is permanently prohibited by architecture.`;
      break;
    }

    // Rule 2: PERSONAL_DATA or USER_DATA requires consent
    if (requiresConsentForTransmission(classification)) {
      requiresConsentFlag = true;
      const targetPurpose = purpose || `transmit_${field}`;
      if (!hasConsent(targetPurpose)) {
        blockedFields.push(field);
        violationReason = `Transmission of '${field}' (${classification}) requires active consent for purpose '${targetPurpose}'.`;
        continue;
      }
    }

    allowedFields.push(field);
  }

  const allowed = blockedFields.length === 0;

  recordAuditEvent({
    timestamp: new Date().toISOString(),
    destinationProviderId,
    allowed,
    blockedCount: blockedFields.length,
    allowedCount: allowedFields.length,
    violationReason,
    blockedFields,
  });

  return {
    allowed,
    reason: violationReason,
    blockedFields,
    allowedFields,
    violationClass,
    requiresConsent: requiresConsentFlag,
  };
}

/**
 * Asserts that the transmission is permitted. Throws specific error if blocked.
 */
export function assertCanTransmit(req: TransmissionRequest): void {
  const evaluation = evaluateTransmission(req);
  if (!evaluation.allowed) {
    if (evaluation.violationClass === DataClass.SENSITIVE_CONTEXT) {
      throw new PrivacyViolationError(
        evaluation.reason || 'SENSITIVE_CONTEXT transmission violation',
        evaluation.blockedFields[0],
        DataClass.SENSITIVE_CONTEXT
      );
    }

    if (evaluation.reason?.includes('not registered') || evaluation.reason?.includes('inactive')) {
      throw new UnapprovedProviderError(
        evaluation.reason,
        req.destinationProviderId
      );
    }

    if (evaluation.requiresConsent) {
      throw new ConsentRequiredError(
        evaluation.reason || 'Consent required for transmission',
        evaluation.blockedFields[0],
        req.purpose || 'unknown_purpose'
      );
    }

    throw new Error(`Transmission blocked: ${evaluation.reason}`);
  }
}

/**
 * Sanitizes a payload object by stripping any fields that are not permitted for transmission.
 */
export function sanitizeTransmissionPayload<T extends Record<string, unknown>>(
  payload: T,
  destinationProviderId: string,
  purpose?: string
): Partial<T> {
  const sanitized: Partial<T> = {};

  for (const [key, value] of Object.entries(payload)) {
    const evalResult = evaluateTransmission({
      destinationProviderId,
      fieldKeys: [key],
      purpose,
    });

    if (evalResult.allowed) {
      sanitized[key as keyof T] = value as T[keyof T];
    }
  }

  return sanitized;
}

/**
 * Wraps an asynchronous network dispatch in the Transmission Gate.
 */
export async function transmitSafely<T>(
  req: TransmissionRequest,
  sendFn: () => Promise<T>
): Promise<T> {
  assertCanTransmit(req);
  return await sendFn();
}
