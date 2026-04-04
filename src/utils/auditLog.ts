import { supabase } from '@/integrations/supabase/client';

export type AuditAction =
  | 'SETTINGS_UPDATED'
  | 'SITE_CREATED'
  | 'SITE_UPDATED'
  | 'SITE_DELETED'
  | 'PCAP_UPLOADED'
  | 'PCAP_DELETED'
  | 'UPLOAD_SESSION_CREATED'
  | 'UPLOAD_SESSION_DELETED'
  | 'PROCESSING_JOB_CREATED'
  | 'PROCESSING_JOB_CANCELLED'
  | 'PROCESSING_JOB_DELETED'
  | 'ANALYSIS_TRIGGERED'
  | 'PHOTO_ANALYSIS_TRIGGERED'
  | 'VARIABLE_CONFIRMED'
  | 'VARIABLE_EDITED'
  | 'VARIABLE_RESET'
  | 'EQUIPMENT_SYNCED'
  | 'CATALOG_CREATED'
  | 'CATALOG_UPDATED'
  | 'CATALOG_DELETED'
  | 'CATALOG_LINKED'
  | 'CATALOG_UNLINKED'
  | 'CATALOG_PROTOCOL_ADDED'
  | 'CATALOG_REGISTERS_IMPORTED'
  | 'AI_CATEGORIZATION_RUN'
  | 'USER_APPROVED'
  | 'USER_REVOKED'
  | 'USER_ADMIN_TOGGLED'
  | 'USER_REJECTED'
  | 'CLEAR_SITE_DATA'
  | 'CLEAR_ALL_DISCOVERY_DATA';

export type AuditTargetType =
  | 'settings'
  | 'site'
  | 'pcap_file'
  | 'upload_session'
  | 'processing_job'
  | 'analysis_job'
  | 'photo_analysis_job'
  | 'variable'
  | 'equipment'
  | 'catalog'
  | 'catalog_protocol'
  | 'user'
  | 'all_sites';

interface AuditLogEntry {
  action: AuditAction;
  target_type: AuditTargetType;
  target_identifier?: string | null;
  details?: Record<string, unknown> | null;
}

/**
 * Log an audit event. Fails silently to avoid disrupting user flows.
 */
export const logAudit = async (entry: AuditLogEntry): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('audit_logs').insert({
      action: entry.action,
      target_type: entry.target_type,
      target_identifier: entry.target_identifier || null,
      details: entry.details || null,
      performed_by: user.id,
    });
  } catch (error) {
    // Fail silently — audit logging should never block user actions
    console.warn('[auditLog] Failed to log audit event:', error);
  }
};