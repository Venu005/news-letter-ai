"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type WorkflowFlags = {
  saveDisabled?: boolean;
  publishDisabled?: boolean;
  savePending?: boolean;
  publishPending?: boolean;
};

type WorkflowActionsContextValue = WorkflowFlags & {
  saveRef: React.RefObject<(() => void) | undefined>;
  publishRef: React.RefObject<(() => void) | undefined>;
  setFlags: (flags: WorkflowFlags) => void;
};

const IssueWorkflowActionsContext =
  createContext<WorkflowActionsContextValue | null>(null);

function flagsEqual(a: WorkflowFlags, b: WorkflowFlags): boolean {
  return (
    a.saveDisabled === b.saveDisabled &&
    a.publishDisabled === b.publishDisabled &&
    a.savePending === b.savePending &&
    a.publishPending === b.publishPending
  );
}

export function IssueWorkflowActionsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const saveRef = useRef<(() => void) | undefined>(undefined);
  const publishRef = useRef<(() => void) | undefined>(undefined);
  const [flags, setFlagsState] = useState<WorkflowFlags>({});

  const setFlags = useCallback((next: WorkflowFlags) => {
    setFlagsState((prev) => (flagsEqual(prev, next) ? prev : next));
  }, []);

  const value = useMemo(
    () => ({ ...flags, saveRef, publishRef, setFlags }),
    [flags, setFlags],
  );

  return (
    <IssueWorkflowActionsContext.Provider value={value}>
      {children}
    </IssueWorkflowActionsContext.Provider>
  );
}

export function useIssueWorkflowActionsRegistration({
  onSave,
  onPublish,
  saveDisabled,
  publishDisabled,
  savePending,
  publishPending,
}: WorkflowFlags & {
  onSave?: () => void;
  onPublish?: () => void;
}) {
  const ctx = useContext(IssueWorkflowActionsContext);

  if (ctx) {
    ctx.saveRef.current = onSave;
    ctx.publishRef.current = onPublish;
  }

  useEffect(() => {
    if (!ctx) return;
    ctx.setFlags({ saveDisabled, publishDisabled, savePending, publishPending });
  }, [ctx, saveDisabled, publishDisabled, savePending, publishPending]);
}

export function useIssueWorkflowActions() {
  const ctx = useContext(IssueWorkflowActionsContext);
  if (!ctx) return null;

  return {
    saveDisabled: ctx.saveDisabled,
    publishDisabled: ctx.publishDisabled,
    savePending: ctx.savePending,
    publishPending: ctx.publishPending,
    onSave: () => ctx.saveRef.current?.(),
    onPublish: () => ctx.publishRef.current?.(),
  };
}
