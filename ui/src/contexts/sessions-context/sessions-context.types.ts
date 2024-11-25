import {
  GetSessionDetailsError,
  GetSessionDetailsResponse,
  ReleaseBrowserSessionResponse,
  ReleaseBrowserSessionsError,
} from "@/steel-client";
import { ReactNode } from "react";
import { UseMutationResult, UseQueryResult } from "react-query";

export type SessionsContextType = {
  useReleaseSessionMutation: () => UseMutationResult<
    ReleaseBrowserSessionResponse,
    ReleaseBrowserSessionsError,
    string,
    unknown
  >;
  useSession: (
    id: string
  ) => UseQueryResult<GetSessionDetailsResponse | null, GetSessionDetailsError>;
  // useSessionLogs: (
  //   id: string
  // ) => UseQueryResult<GetSessionLogsResponse, ErrorResponse>;
  // useSessionEvents: (
  //   id: string
  // ) => UseQueryResult<GetSessionEventsResponse, ErrorResponse>;
};

export type SessionsProviderProps = {
  children: ReactNode;
};
