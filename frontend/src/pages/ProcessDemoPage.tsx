import React, { useEffect, useState } from "react";
import "./ProcessDemoPage.css";
import { listFunctions, createFunction, listPrograms, createProgram, deployProgram } from "../services/processApi";
import { ProcessFunction, ProcessProgram } from "../types";

const ProcessDemoPage: React.FC = () => {
  const [functions, setFunctions] = useState<ProcessFunction[]>([]);
  const [programs, setPrograms] = useState<ProcessProgram[]>([]);
  const [log, setLog] = useState<string>("");
  const [functionForm, setFunctionForm] = useState<{
    code: number | "";
    name: string;
    description: string;
    args: { position: number; name: string; type: string; required: boolean }[];
  }>({
    code: "",
    name: "",
    description: "",
    args: [{ position: 1, name: "arg1", type: "int16", required: true }],
  });
  const [programForm, setProgramForm] = useState<{
    name: string;
    description: string;
    version: number | "";
    baseAddress: number | "";
    stepWords: number | "";
    steps: { sequence: number; functionId: number; argsText: string }[];
  }>({
    name: "",
    description: "",
    version: "",
    baseAddress: "",
    stepWords: "",
    steps: [{ sequence: 1, functionId: 0, argsText: '{"value":100}' }],
  });
  const [deployForm, setDeployForm] = useState<{ programId: number | "" }>({
    programId: "",
  });

  const addFunctionArg = () => {
    setFunctionForm((prev) => ({
      ...prev,
      args: [...prev.args, { position: prev.args.length + 1, name: `arg${prev.args.length + 1}`, type: "int16", required: true }],
    }));
  };

  const updateFunctionArg = (idx: number, patch: Partial<{ position: number; name: string; type: string; required: boolean }>) => {
    setFunctionForm((prev) => ({
      ...prev,
      args: prev.args.map((a, i) => (i === idx ? { ...a, ...patch } : a)),
    }));
  };

  const removeFunctionArg = (idx: number) => {
    setFunctionForm((prev) => ({ ...prev, args: prev.args.filter((_, i) => i !== idx) }));
  };

  const addProgramStep = () => {
    setProgramForm((prev) => ({
      ...prev,
      steps: [...prev.steps, { sequence: prev.steps.length + 1, functionId: functions[0]?.id || 0, argsText: '{"value":0}' }],
    }));
  };

  const updateProgramStep = (idx: number, patch: Partial<{ sequence: number; functionId: number; argsText: string }>) => {
    setProgramForm((prev) => ({
      ...prev,
      steps: prev.steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));
  };

  const removeProgramStep = (idx: number) => {
    setProgramForm((prev) => ({ ...prev, steps: prev.steps.filter((_, i) => i !== idx) }));
  };

  const appendLog = (msg: string) => setLog((prev) => `[${new Date().toLocaleTimeString()}] ${msg}\n${prev}`);

  const loadAll = async () => {
    try {
      const [f, p] = await Promise.all([listFunctions(), listPrograms()]);
      setFunctions(f);
      setPrograms(p);
    } catch (e: any) {
      appendLog(`Load failed: ${e.message}`);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (functions.length > 0) {
      setProgramForm((prev) => ({
        ...prev,
        steps: prev.steps.map((s) => (s.functionId === 0 ? { ...s, functionId: functions[0].id } : s)),
      }));
    }
  }, [functions]);

  const handleCreateFunction = async () => {
    try {
      if (!functionForm.code || !functionForm.name) {
        appendLog("Function code and name are required.");
        return;
      }
      const payload = {
        code: Number(functionForm.code),
        name: functionForm.name,
        description: functionForm.description || undefined,
        args: functionForm.args.map((a) => ({
          position: a.position,
          name: a.name,
          type: a.type,
          required: a.required,
        })),
      };
      const created = await createFunction(payload);
      appendLog(`Created function ${created.name} (#${created.id})`);
      setFunctionForm({
        code: "",
        name: "",
        description: "",
        args: [{ position: 1, name: "arg1", type: "int16", required: true }],
      });
      await loadAll();
    } catch (e: any) {
      appendLog(`Create function failed: ${e.message}`);
    }
  };

  const handleCreateProgram = async () => {
    try {
      if (!programForm.name) {
        appendLog("Program name is required.");
        return;
      }
      const steps = [];
      for (const step of programForm.steps) {
        if (!step.functionId) {
          appendLog("Each step needs a functionId.");
          return;
        }
        let parsedArgs: Record<string, any> = {};
        if (step.argsText) {
          try {
            parsedArgs = JSON.parse(step.argsText);
          } catch (err: any) {
            appendLog(`Invalid JSON for step ${step.sequence}: ${err.message}`);
            return;
          }
        }
        steps.push({ sequence: step.sequence, functionId: step.functionId, args: parsedArgs });
      }
      const payload = {
        name: programForm.name,
        description: programForm.description || undefined,
        version: programForm.version ? Number(programForm.version) : 1,
        baseAddress: programForm.baseAddress === "" ? undefined : Number(programForm.baseAddress),
        stepWords: programForm.stepWords === "" ? undefined : Number(programForm.stepWords),
        steps,
      };
      const created = await createProgram(payload);
      appendLog(`Created program ${created.name} (#${created.id})`);
      setProgramForm({
        name: "",
        description: "",
        version: "",
        baseAddress: "",
        stepWords: "",
        steps: [{ sequence: 1, functionId: 0, argsText: '{"value":100}' }],
      });
      await loadAll();
    } catch (e: any) {
      appendLog(`Create program failed: ${e.message}`);
    }
  };

  const deploySelectedProgram = async () => {
    try {
      if (!deployForm.programId) {
        appendLog("Select a program to deploy.");
        return;
      }
      const res = await deployProgram(Number(deployForm.programId), {});
      appendLog(`Deployed program #${deployForm.programId} to PLC @D${res.baseAddress}, words=${res.words.length}`);
    } catch (e: any) {
      appendLog(`Deploy failed: ${e.response?.data?.message || e.message}`);
    }
  };

  return (
    <div className="page process-demo-page">
      <h1 className="page-title">Process Demo</h1>
      <div className="card-grid column">
        <div className="card">
          <div className="card-header">
            <h2>Create Function</h2>
            <button className="btn btn-primary" onClick={handleCreateFunction}>
              Save Function
            </button>
          </div>
          <div className="form-grid">
            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Code</label>
                <input className="form-input" type="number" value={functionForm.code} onChange={(e) => setFunctionForm({ ...functionForm, code: e.target.value ? Number(e.target.value) : "" })} />
              </div>
              <div className="form-field">
                <label className="form-label">Name</label>
                <input className="form-input" value={functionForm.name} onChange={(e) => setFunctionForm({ ...functionForm, name: e.target.value })} />
              </div>
            </div>
            <div className="form-field">
              <label className="form-label">Description</label>
              <input className="form-input" value={functionForm.description} onChange={(e) => setFunctionForm({ ...functionForm, description: e.target.value })} />
            </div>
            <div className="sub-section">
              <div className="sub-header">
                <h3>Args</h3>
                <button type="button" className="btn btn-neutral btn-small" onClick={addFunctionArg}>
                  +
                </button>
              </div>
              {functionForm.args.map((a, idx) => (
                <div className="form-row" key={idx}>
                  <div className="form-field small">
                    <label className="form-label">Pos</label>
                    <input className="form-input" type="number" value={a.position} onChange={(e) => updateFunctionArg(idx, { position: Number(e.target.value) })} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Name</label>
                    <input className="form-input" value={a.name} onChange={(e) => updateFunctionArg(idx, { name: e.target.value })} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Type</label>
                    <select className="form-select" value={a.type} onChange={(e) => updateFunctionArg(idx, { type: e.target.value })}>
                      <option value="int16">int16</option>
                      <option value="int32">int32</option>
                      <option value="real">real</option>
                      <option value="string">string</option>
                      <option value="bool">bool</option>
                    </select>
                  </div>
                  <div className="form-field small">
                    <label className="form-label">Required</label>
                    <select className="form-select" value={a.required ? "true" : "false"} onChange={(e) => updateFunctionArg(idx, { required: e.target.value === "true" })}>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                  <button type="button" className="btn btn-danger btn-small" onClick={() => removeFunctionArg(idx)}>
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </div>
          <h3>Function List</h3>
          {functions.length === 0 ? (
            <div className="empty-state">No functions</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Args</th>
                </tr>
              </thead>
              <tbody>
                {functions.map((f) => (
                  <tr key={f.id}>
                    <td>{f.id}</td>
                    <td>{f.code}</td>
                    <td>{f.name}</td>
                    <td>{f.args.map((a) => `${a.name}:${a.type}`).join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Create Program</h2>
            <button className="btn btn-primary" onClick={handleCreateProgram}>
              Save Program
            </button>
          </div>
          <div className="form-grid">
            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Name</label>
                <input className="form-input" value={programForm.name} onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })} />
              </div>
              <div className="form-field">
                <label className="form-label">Version</label>
                <input className="form-input" type="number" value={programForm.version} onChange={(e) => setProgramForm({ ...programForm, version: e.target.value ? Number(e.target.value) : "" })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Base Address</label>
                <input className="form-input" type="number" value={programForm.baseAddress} onChange={(e) => setProgramForm({ ...programForm, baseAddress: e.target.value ? Number(e.target.value) : "" })} placeholder="default 1000" />
              </div>
              <div className="form-field">
                <label className="form-label">Step Words</label>
                <input className="form-input" type="number" value={programForm.stepWords} onChange={(e) => setProgramForm({ ...programForm, stepWords: e.target.value ? Number(e.target.value) : "" })} placeholder="default 10" />
              </div>
            </div>
            <div className="form-field">
              <label className="form-label">Description</label>
              <input className="form-input" value={programForm.description} onChange={(e) => setProgramForm({ ...programForm, description: e.target.value })} />
            </div>
            <div className="sub-section">
              <div className="sub-header">
                <h3>Steps</h3>
                <button type="button" className="btn btn-neutral btn-small" onClick={addProgramStep}>
                  +
                </button>
              </div>
              {programForm.steps.map((s, idx) => (
                <div className="form-row" key={idx}>
                  <div className="form-field small">
                    <label className="form-label">Seq</label>
                    <input className="form-input" type="number" value={s.sequence} onChange={(e) => updateProgramStep(idx, { sequence: Number(e.target.value) })} />
                  </div>
                  <div className="form-field small">
                    <label className="form-label">Function</label>
                    <input className="form-input" type="number" value={s.functionId} onChange={(e) => updateProgramStep(idx, { functionId: Number(e.target.value) })} placeholder="functionId" />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Args JSON</label>
                    <input className="form-input" value={s.argsText} onChange={(e) => updateProgramStep(idx, { argsText: e.target.value })} />
                  </div>
                  <button type="button" className="btn btn-danger btn-small" onClick={() => removeProgramStep(idx)}>
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </div>
          <h3>Program List</h3>
          {programs.length === 0 ? (
            <div className="empty-state">No programs</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Base</th>
                  <th>StepWords</th>
                  <th>Steps</th>
                </tr>
              </thead>
              <tbody>
                {programs.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.name}</td>
                    <td>{p.baseAddress}</td>
                    <td>{p.stepWords}</td>
                    <td>{p.steps.map((s) => `${s.sequence}:${s.functionId}`).join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Select Program &amp; Apply</h2>
            <button className="btn btn-success" onClick={deploySelectedProgram} disabled={!deployForm.programId}>
              Apply to PLC
            </button>
          </div>
          <div className="form-grid">
            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Select Program</label>
                <select className="form-select" value={deployForm.programId} onChange={(e) => setDeployForm({ ...deployForm, programId: e.target.value ? Number(e.target.value) : "" })}>
                  <option value="">Select program</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.id} - {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Log</h2>
            <button className="btn btn-neutral" onClick={() => setLog("")}>
              Clear
            </button>
          </div>
          <pre className="log-box">{log || "Logs will appear here..."}</pre>
        </div>
      </div>
    </div>
  );
};

export default ProcessDemoPage;
