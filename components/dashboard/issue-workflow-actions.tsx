"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type WorkflowActions = {
  onSave?: () => void;
  onPublish?: () => void;
  saveDisabled?: boolean;
  publishDisabled?: boolean;
  savePending?: boolean;
  publishPending?: boolean;
};

type WorkflowActionsContextValue = WorkflowActions & {
  register: (actions: WorkflowActions) => () => void;
};

const IssueWorkflowActionsContext =
  createContext<WorkflowActionsContextValue | null>(null);

export function IssueWorkflowActionsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [actions, setActions] = useState<WorkflowActions>({});

  const register = useCallback((next: WorkflowActions) => {
    setActions(next);
    return () => setActions({});
  }, []);

  const value = useMemo(
    () => ({ ...actions, register }),
    [actions, register],
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
}: WorkflowActions) {
  const ctxRef = useContext(IssueWorkflowActionsContext);

  useEffect(() => {
    if (!ctxRef) return;
    return ctxRef.register({
      onSave,
      onPublish,
      saveDisabled,
      publishDisabled,
      savePending,
      publishPending,
    });
    // ctxRef.register is stable — exclude ctxRef from deps to avoid re-registering
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSave, onPublish, saveDisabled, publishDisabled, savePending, publishPending]);
}

export function useIssueWorkflowActions() {
  return useContext(IssueWorkflowActionsContext);
}
