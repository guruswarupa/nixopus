import { useState, useMemo, useCallback, useEffect } from 'react';
import { ApplicationLogs } from '@/redux/types/applications';
import {
  useGetDeploymentLogsQuery,
  useGetApplicationLogsQuery
} from '@/redux/services/deploy/applicationsApi';
import { useApplicationWebSocket } from './use_application_websocket';
import { SOCKET_EVENTS } from '@/redux/api-conf';

const LOGS_DENSE_MODE_KEY = 'nixopus_logs_dense_mode';

export interface DeploymentLogsViewerProps {
  id: string;
  isDeployment?: boolean;
  pageSize?: number;
}

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface FormattedLogEntry {
  id: string;
  timestamp: string;
  formattedTime: string;
  message: string;
  level: LogLevel;
  raw: ApplicationLogs;
}

export interface LogFilters {
  startDate: string;
  endDate: string;
  level: LogLevel | 'all';
}

export function useDeploymentLogsViewer({
  id,
  isDeployment = false,
  pageSize = 50
}: DeploymentLogsViewerProps) {
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [allLogs, setAllLogs] = useState<ApplicationLogs[]>([]);
  const [isDense, setIsDense] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LOGS_DENSE_MODE_KEY);
      return stored !== null ? stored === 'true' : true; // Default to true (condensed mode)
    }
    return true;
  });
  const [filters, setFilters] = useState<LogFilters>({
    startDate: '',
    endDate: '',
    level: 'all'
  });

  useEffect(() => {
    localStorage.setItem(LOGS_DENSE_MODE_KEY, isDense.toString());
  }, [isDense]);

  const { message } = useApplicationWebSocket(id);

  // Convert datetime-local format (YYYY-MM-DDTHH:mm) to RFC3339 format for API
  const convertToRFC3339 = (
    datetimeLocal: string,
    isEndDate: boolean = false
  ): string | undefined => {
    if (!datetimeLocal) return undefined;

    try {
      // If it's in datetime-local format (has T), convert it
      if (datetimeLocal.includes('T')) {
        const parts = datetimeLocal.split('T');
        if (parts.length !== 2) return undefined;

        // Ensure we have seconds if not provided
        const timePart = parts[1];
        let timeWithSeconds = timePart;

        // Count colons to determine format
        const colonCount = (timePart.match(/:/g) || []).length;
        if (colonCount === 1) {
          // Format: HH:mm, add seconds
          // For end dates, set to end of minute (59.999), for start dates set to beginning (00)
          if (isEndDate) {
            timeWithSeconds = `${timePart}:59.999`;
          } else {
            timeWithSeconds = `${timePart}:00`;
          }
        } else if (colonCount === 2 && !timePart.includes('.')) {
          // Format: HH:mm:ss, already has seconds
          // For end dates, add milliseconds if not present
          if (isEndDate && !timePart.includes('.')) {
            timeWithSeconds = `${timePart}.999`;
          } else {
            timeWithSeconds = timePart;
          }
        }

        // Combine date and time, then convert to ISO string (RFC3339)
        const dateTimeString = `${parts[0]}T${timeWithSeconds}`;
        const date = new Date(dateTimeString);

        // Validate the date
        if (isNaN(date.getTime())) return undefined;

        return date.toISOString();
      }

      // If it's just a date (YYYY-MM-DD)
      // For start dates, treat as start of day, for end dates treat as end of day
      if (isEndDate) {
        const date = new Date(datetimeLocal + 'T23:59:59.999');
        if (isNaN(date.getTime())) return undefined;
        return date.toISOString();
      } else {
        const date = new Date(datetimeLocal + 'T00:00:00');
        if (isNaN(date.getTime())) return undefined;
        return date.toISOString();
      }
    } catch {
      return undefined;
    }
  };

  const startTime = convertToRFC3339(filters.startDate, false);
  const endTime = convertToRFC3339(filters.endDate, true);

  const {
    data: deploymentLogs,
    isLoading: isLoadingDeployment,
    refetch: refetchDeploymentLogs
  } = useGetDeploymentLogsQuery(
    {
      id,
      page: currentPage,
      page_size: pageSize,
      search_term: searchTerm,
      start_time: startTime,
      end_time: endTime
    },
    { skip: !isDeployment || !id }
  );

  const {
    data: applicationLogs,
    isLoading: isLoadingApplication,
    refetch: refetchApplicationLogs
  } = useGetApplicationLogsQuery(
    {
      id,
      page: currentPage,
      page_size: pageSize,
      search_term: searchTerm,
      start_time: startTime,
      end_time: endTime
    },
    { skip: isDeployment || !id }
  );

  const logsResponse = isDeployment ? deploymentLogs : applicationLogs;
  const isLoading = isDeployment ? isLoadingDeployment : isLoadingApplication;

  useEffect(() => {
    if (!message) return;
    handleWebSocketMessage(message, setAllLogs, isDeployment ? id : undefined);
  }, [message, isDeployment, id]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setAllLogs([]);
  }, [filters.startDate, filters.endDate, filters.level]);

  useEffect(() => {
    if (logsResponse?.logs) {
      syncLogsFromResponse(logsResponse.logs, currentPage, setAllLogs);
    }
  }, [logsResponse, currentPage]);

  const formattedLogs = useMemo(() => {
    return formatLogsForDisplay(allLogs, searchTerm, filters);
  }, [allLogs, searchTerm, filters]);

  const toggleLogExpansion = useCallback((logId: string) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  }, []);

  const isLogExpanded = useCallback((logId: string) => expandedLogIds.has(logId), [expandedLogIds]);

  const expandAll = useCallback(() => {
    setExpandedLogIds(new Set(formattedLogs.map((log) => log.id)));
  }, [formattedLogs]);

  const collapseAll = useCallback(() => {
    setExpandedLogIds(new Set());
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ startDate: '', endDate: '', level: 'all' });
    setSearchTerm('');
  }, []);

  const refreshLogs = useCallback(async () => {
    setAllLogs([]);
    setCurrentPage(1);
    if (isDeployment) {
      await refetchDeploymentLogs();
    } else {
      await refetchApplicationLogs();
    }
  }, [isDeployment, refetchDeploymentLogs, refetchApplicationLogs]);

  return {
    logs: formattedLogs,
    isLoading,
    expandedLogIds,
    toggleLogExpansion,
    isLogExpanded,
    expandAll,
    collapseAll,
    searchTerm,
    setSearchTerm,
    currentPage,
    setCurrentPage,
    totalPages: logsResponse?.total_pages || 1,
    totalCount: logsResponse?.total_count || 0,
    filters,
    setFilters,
    clearFilters,
    isDense,
    setIsDense,
    refreshLogs
  };
}

function handleWebSocketMessage(
  message: string,
  setAllLogs: React.Dispatch<React.SetStateAction<ApplicationLogs[]>>,
  deploymentIdFilter?: string
) {
  try {
    const parsed = JSON.parse(message);
    if (!parsed?.topic || !parsed?.data) return;

    if (parsed.topic.includes(SOCKET_EVENTS.MONITOR_APPLICATION_DEPLOYMENT)) {
      const { action, table, data } = parsed.data;
      if ((action === 'INSERT' || action === 'UPDATE') && table === 'application_logs') {
        // When viewing a specific deployment, only include logs for that deployment
        if (deploymentIdFilter && data.application_deployment_id !== deploymentIdFilter) {
          return;
        }
        setAllLogs((prev) => [...prev, data]);
      }
    }
  } catch (error) {
    console.error('Error parsing WebSocket message:', error);
  }
}

function syncLogsFromResponse(
  logs: ApplicationLogs[],
  currentPage: number,
  setAllLogs: React.Dispatch<React.SetStateAction<ApplicationLogs[]>>
) {
  if (currentPage === 1) {
    setAllLogs(logs);
  } else {
    setAllLogs((prev) => {
      const newLogs = logs.filter((newLog) => !prev.some((p) => p.id === newLog.id));
      return [...newLogs, ...prev];
    });
  }
}

function formatLogsForDisplay(
  logs: ApplicationLogs[],
  searchTerm: string,
  filters: LogFilters
): FormattedLogEntry[] {
  const sorted = [...logs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const filtered = sorted.filter((log) => {
    const matchesSearch = !searchTerm || log.log.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDateRange = isWithinDateRange(log.created_at, filters.startDate, filters.endDate);
    const level = detectLogLevel(log.log);
    const matchesLevel = filters.level === 'all' || level === filters.level;
    return matchesSearch && matchesDateRange && matchesLevel;
  });

  return filtered.map((log) => ({
    id: log.id,
    timestamp: log.created_at,
    formattedTime: formatTimestamp(log.created_at),
    message: log.log,
    level: detectLogLevel(log.log),
    raw: log
  }));
}

function isWithinDateRange(timestamp: string, startDate: string, endDate: string): boolean {
  if (!startDate && !endDate) return true;

  const logDate = new Date(timestamp);
  if (isNaN(logDate.getTime())) return false;

  // Handle datetime-local format (YYYY-MM-DDTHH:mm) or date format (YYYY-MM-DD)
  if (startDate) {
    let startDateTime: Date;
    if (startDate.includes('T')) {
      // datetime-local format: YYYY-MM-DDTHH:mm
      // Need to ensure we have seconds for proper comparison
      const timePart = startDate.split('T')[1];
      const colonCount = (timePart.match(/:/g) || []).length;
      let fullDateTime = startDate;

      if (colonCount === 1) {
        // Format: HH:mm, add seconds
        fullDateTime = `${startDate}:00`;
      }

      startDateTime = new Date(fullDateTime);
    } else {
      // Just date: YYYY-MM-DD, treat as start of day
      startDateTime = new Date(startDate + 'T00:00:00');
    }

    if (isNaN(startDateTime.getTime())) return false;

    // Compare at second precision
    if (logDate < startDateTime) return false;
  }

  if (endDate) {
    let endDateTime: Date;
    if (endDate.includes('T')) {
      // datetime-local format: YYYY-MM-DDTHH:mm
      const timePart = endDate.split('T')[1];
      const colonCount = (timePart.match(/:/g) || []).length;
      let fullDateTime = endDate;

      if (colonCount === 1) {
        // Format: HH:mm, add seconds and set to end of that minute
        fullDateTime = `${endDate}:59`;
      } else {
        // Already has seconds, ensure we include up to the end of that second
        fullDateTime = endDate;
      }

      endDateTime = new Date(fullDateTime);
    } else {
      // Just date: YYYY-MM-DD, treat as end of day
      endDateTime = new Date(endDate + 'T23:59:59.999');
    }

    if (isNaN(endDateTime.getTime())) return false;

    // Compare at second precision
    if (logDate > endDateTime) return false;
  }

  return true;
}

function detectLogLevel(message: string): LogLevel {
  const lowerMessage = message.toLowerCase();
  if (
    lowerMessage.includes('error') ||
    lowerMessage.includes('failed') ||
    lowerMessage.includes('exception')
  ) {
    return 'error';
  }
  if (lowerMessage.includes('warn') || lowerMessage.includes('warning')) {
    return 'warn';
  }
  if (lowerMessage.includes('debug')) {
    return 'debug';
  }
  return 'info';
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);

  // Format date parts
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.toLocaleString('en-US', { day: '2-digit' });
  const year = date.toLocaleString('en-US', { year: 'numeric' });

  // Format time in 12-hour format with AM/PM
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;

  const timeStr = `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${ampm}`;

  return `${month} ${day}, ${year}, ${timeStr}`;
}

export default useDeploymentLogsViewer;
