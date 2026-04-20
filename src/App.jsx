import { useState, useMemo, useEffect } from "react";
import { INITIAL_STATE } from "./data/initialState.js";
import { useTheme } from "./hooks/useTheme.js";
import { LoginScreen } from "./components/layout/LoginScreen.jsx";
import { Sidebar } from "./components/layout/Sidebar.jsx";
import { TopBar } from "./components/layout/TopBar.jsx";
import { ResourceExplorer } from "./views/explorer/ResourceExplorer.jsx";
import { DebugView } from "./views/debug/DebugCenter.jsx";
import { AdminPanelView } from "./views/admin/AdminPanelView.jsx";
import { INITIAL_FLOW } from "./utils/explorerHelpers.js";

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [view, setView] = useState("explorer");
  const [state, setState] = useState(INITIAL_STATE);
  const [flow, setFlow] = useState(INITIAL_FLOW);
  const [theme, setTheme] = useTheme();

  useEffect(() => {
    if (!state.accounts.some((a) => a.id === flow.accountId)) {
      const fallback = state.accounts[0]?.id;
      if (fallback) setFlow((f) => ({ ...f, accountId: fallback, namespaceId: null, queueId: null, shardId: null, segmentId: null }));
    }
  }, [state.accounts, flow.accountId]);

  const onAccountChange = (accountId) => {
    const acc = state.accounts.find((a) => a.id === accountId);
    setState((s) => ({
      ...s,
      user: { ...s.user, accountId, account: acc?.name ?? s.user.account },
    }));
    setFlow({ accountId, namespaceId: null, queueId: null, shardId: null, segmentId: null });
  };

  const breadcrumbItems = useMemo(() => {
    if (view === "debug") {
      return [
        {
          label: "Resources",
          onClick: () => setView("explorer"),
        },
        { label: "Debug Center" },
      ];
    }
    if (view === "admin") {
      return [
        { label: "Resources", onClick: () => setView("explorer") },
        { label: "Admin panel" },
      ];
    }
    const acc = state.accounts.find((a) => a.id === flow.accountId);
    const items = [
      {
        label: acc?.name || "Account",
        onClick: () => setFlow({ accountId: flow.accountId, namespaceId: null, queueId: null, shardId: null, segmentId: null }),
      },
    ];
    if (flow.namespaceId) {
      const ns = state.namespaces.find((n) => n.id === flow.namespaceId);
      items.push({
        label: ns?.name || "Namespace",
        onClick: () =>
          setFlow({
            accountId: flow.accountId,
            namespaceId: flow.namespaceId,
            queueId: null,
            shardId: null,
            segmentId: null,
          }),
      });
    }
    if (flow.queueId) {
      const q = state.queues.find((x) => x.id === flow.queueId);
      items.push({
        label: q?.name || "Queue",
        onClick: () =>
          setFlow({
            accountId: flow.accountId,
            namespaceId: flow.namespaceId,
            queueId: flow.queueId,
            shardId: null,
            segmentId: null,
          }),
      });
    }
    if (flow.shardId != null && flow.queueId) {
      items.push({
        label: `Shard ${flow.shardId}`,
        onClick: () =>
          setFlow({
            accountId: flow.accountId,
            namespaceId: flow.namespaceId,
            queueId: flow.queueId,
            shardId: flow.shardId,
            segmentId: null,
          }),
      });
    }
    if (flow.segmentId) {
      items.push({ label: flow.segmentId });
    }
    return items;
  }, [flow, state.accounts, state.namespaces, state.queues, view]);

  if (!authed) {
    return <LoginScreen onLogin={() => setAuthed(true)} theme={theme} onThemeChange={setTheme} />;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar view={view} setView={setView} state={state} flow={flow} onAccountChange={onAccountChange} />
      <main
        style={{
          position: "relative",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <TopBar
          breadcrumbItems={breadcrumbItems}
          user={state.user}
          onLogout={() => setAuthed(false)}
          theme={theme}
          onThemeChange={setTheme}
          onOpenAdminPanel={() => setView("admin")}
        />
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ maxWidth: 1440, margin: "0 auto", padding: "40px 48px 64px" }}>
            {view === "explorer" && (
              <ResourceExplorer flow={flow} setFlow={setFlow} state={state} setState={setState} />
            )}
            {view === "admin" && <AdminPanelView state={state} setState={setState} flow={flow} />}
            {view === "debug" && <DebugView state={state} />}
          </div>
        </div>
        {/* Modals portal: overlay covers main column only (not sidebar) */}
        <div id="main-modal-root" className="main-modal-root" />
      </main>
    </div>
  );
}
