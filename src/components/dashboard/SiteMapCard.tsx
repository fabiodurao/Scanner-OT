import { Badge } from '@/components/ui/badge';
import { siteTypeConfig } from '@/pages/SitesManagement';
import { SITE_TYPE_ICONS } from '@/components/icons/SiteTypeIcon';
import { SiteDiscoveryStats } from '@/types/discovery';
import {
  MapPin,
  Server,
  Variable,
  CheckCircle,
  Clock,
  FileArchive,
  HelpCircle,
  Activity,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SiteMapCardProps {
  site: {
    id: string;
    identifier: string | null;
    name: string | null;
    site_type: string | null;
    city: string | null;
    state: string | null;
  };
  stats: SiteDiscoveryStats | null;
  pcap: { fileCount: number; totalBytes: number } | null;
}

const formatFileSize = (bytes: number): string => {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
};

// This is rendered server-side to HTML string for Google Maps InfoWindow
export const renderSiteMapCardHTML = (
  site: SiteMapCardProps['site'],
  stats: SiteDiscoveryStats | null,
  pcap: { fileCount: number; totalBytes: number } | null
): string => {
  const typeConfig = site.site_type ? siteTypeConfig[site.site_type] : null;
  const confirmed = stats ? stats.variablesByState.confirmed + stats.variablesByState.published : 0;
  const total = stats?.totalVariables || 0;
  const pct = total > 0 ? Math.round((confirmed / total) * 100) : 0;
  const lastActivity = stats?.lastActivity
    ? formatDistanceToNow(new Date(stats.lastActivity), { addSuffix: true })
    : null;
  const pcapLine = pcap && pcap.fileCount > 0
    ? `${pcap.fileCount} PCAP${pcap.fileCount !== 1 ? 's' : ''} · ${formatFileSize(pcap.totalBytes)}`
    : null;

  const isUnregistered = !site.name;

  // Progress bar segments
  const publishedPct = stats && total > 0 ? Math.round((stats.variablesByState.published / total) * 100) : 0;
  const confirmedPct = stats && total > 0 ? Math.round((stats.variablesByState.confirmed / total) * 100) : 0;
  const hypothesisPct = stats && total > 0 ? Math.round((stats.variablesByState.hypothesis / total) * 100) : 0;

  return `
    <div style="
      font-family: 'Space Grotesk', system-ui, sans-serif;
      width: 260px;
      padding: 0;
      border-radius: 8px;
      overflow: hidden;
    ">
      <!-- Header -->
      <div style="padding: 12px 14px 8px; border-bottom: 1px solid #f1f5f9;">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
          <div style="min-width: 0; flex: 1;">
            <div style="font-weight: 700; font-size: 14px; color: #0e182e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${isUnregistered ? `<code style="font-size: 11px; font-family: monospace;">${site.identifier?.slice(0, 20)}...</code>` : site.name}
            </div>
            ${site.city || site.state ? `
              <div style="display: flex; align-items: center; gap: 4px; margin-top: 2px; font-size: 11px; color: #64748b;">
                <span>📍</span>
                <span>${[site.city, site.state].filter(Boolean).join(', ')}</span>
              </div>
            ` : ''}
          </div>
          ${typeConfig ? `
            <span style="
              display: inline-flex; align-items: center; gap: 4px;
              padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600;
              background: ${typeConfig.bgColor}; color: ${typeConfig.primaryColor};
              border: 1px solid ${typeConfig.primaryColor}33;
              white-space: nowrap; flex-shrink: 0;
            ">${typeConfig.label}</span>
          ` : `
            <span style="
              display: inline-flex; align-items: center;
              padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600;
              background: #fef3c7; color: #b45309; border: 1px solid #fcd34d;
              white-space: nowrap; flex-shrink: 0;
            ">Unregistered</span>
          `}
        </div>
      </div>

      <!-- Stats -->
      ${stats ? `
        <div style="padding: 10px 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="padding: 5px; border-radius: 6px; background: #f1f5f9;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/>
                <rect x="2" y="14" width="8" height="8" rx="1"/><rect x="14" y="14" width="8" height="8" rx="1"/>
              </svg>
            </div>
            <div>
              <div style="font-size: 18px; font-weight: 700; color: #0e182e; line-height: 1;">${stats.totalEquipment}</div>
              <div style="font-size: 10px; color: #94a3b8;">Equipment</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="padding: 5px; border-radius: 6px; background: #f1f5f9;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
                <path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
              </svg>
            </div>
            <div>
              <div style="font-size: 18px; font-weight: 700; color: #0e182e; line-height: 1;">${stats.totalVariables}</div>
              <div style="font-size: 10px; color: #94a3b8;">Variables</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="padding: 5px; border-radius: 6px; background: #ecfdf5;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <div>
              <div style="font-size: 18px; font-weight: 700; color: #059669; line-height: 1;">${confirmed}</div>
              <div style="font-size: 10px; color: #94a3b8;">Confirmed</div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="padding: 5px; border-radius: 6px; background: #eff6ff;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <div>
              <div style="font-size: 18px; font-weight: 700; color: #2563eb; line-height: 1;">${stats.sampleCount.toLocaleString()}</div>
              <div style="font-size: 10px; color: #94a3b8;">Samples</div>
            </div>
          </div>
        </div>

        ${total > 0 ? `
          <!-- Progress bar -->
          <div style="padding: 0 14px 10px;">
            <div style="display: flex; height: 6px; border-radius: 9999px; overflow: hidden; background: #f1f5f9;">
              <div style="width: ${publishedPct}%; background: #10b981;"></div>
              <div style="width: ${confirmedPct}%; background: #3b82f6;"></div>
              <div style="width: ${hypothesisPct}%; background: #f59e0b;"></div>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 4px;">
              <span style="font-size: 9px; color: #94a3b8; display: flex; align-items: center; gap: 3px;">
                <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></span>Published
              </span>
              <span style="font-size: 9px; color: #94a3b8; display: flex; align-items: center; gap: 3px;">
                <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #3b82f6;"></span>Confirmed
              </span>
              <span style="font-size: 9px; color: #94a3b8; display: flex; align-items: center; gap: 3px;">
                <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #f59e0b;"></span>Hypothesis
              </span>
            </div>
          </div>
        ` : ''}
      ` : `
        <div style="padding: 12px 14px; text-align: center; color: #94a3b8; font-size: 12px;">
          No data yet
        </div>
      `}

      <!-- Footer -->
      <div style="padding: 8px 14px; border-top: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 3px;">
        ${pcapLine ? `
          <div style="font-size: 10px; color: #94a3b8; display: flex; align-items: center; gap: 4px;">
            <span>📁</span><span>${pcapLine}</span>
          </div>
        ` : ''}
        ${lastActivity ? `
          <div style="font-size: 10px; color: #94a3b8; display: flex; align-items: center; gap: 4px;">
            <span>🕐</span><span>Last activity: ${lastActivity}</span>
          </div>
        ` : ''}
        <div style="font-size: 10px; color: #2563eb; font-weight: 500; margin-top: 2px;">
          Click to open →
        </div>
      </div>
    </div>
  `;
};