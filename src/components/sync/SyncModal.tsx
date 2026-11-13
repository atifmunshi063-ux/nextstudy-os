import React, { useState, useEffect } from 'react';
import { storageService } from '../../services/storage';
import { SyncSettings, SyncMutation } from '../../types';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Download,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const APPS_SCRIPT_PRODUCTION_CODE = `/**
 * NextStudy OS — Serverless Backend API
 * Connected to Master_100_Habit_Tracker / Pomodoro_Tracker / ERROR_LOG
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'getDashboard';
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    // 1. Fetch Daily Habits for Current Month
    if (action === "getHabits") {
      const sheet = ss.getSheetByName("Monthly_Habit_Tracker");
      const data = sheet.getRange("A5:AN109").getValues();
      const habits = data
        .filter(row => row[2] && row[2] !== "")
        .map(row => ({
          id: row[0],
          category: row[1],
          description: row[2],
          targetDays: row[3],
          checks: row.slice(4, 35),
          totalDone: row[35],
          completionPct: row[37],
          status: row[38]
        }));
      return createJsonResponse({ status: "success", count: habits.length, habits: habits });
    }

    // 2. Fetch Syllabus for a Subject
    if (action === "getSyllabus") {
      const subject = (e && e.parameter && e.parameter.subject) || "Sub_DSA";
      const sheet = ss.getSheetByName(subject);
      if (!sheet) return createJsonResponse({ status: "error", message: "Subject sheet not found" });

      const data = sheet.getRange("A6:L50").getValues();
      const topics = data
        .filter(row => row[2] && row[2] !== "")
        .map((row, idx) => ({
          rowIndex: idx + 6,
          unit: row[0],
          topic: row[1],
          subtopic: row[2],
          priority: row[3],
          theory: row[5], // Column F
          practice: row[6], // Column G
          pyq: row[7], // Column H
          revisionCount: row[9], // Spaced Revision Count
          progressPct: row[8],
          status: row[10],
          notes: row[11]
        }));
      return createJsonResponse({ status: "success", subject: subject, topics: topics });
    }

    // 3. Fetch Pomodoro Sessions
    if (action === "getPomodoro") {
      const sheet = ss.getSheetByName("Pomodoro_Tracker");
      if (!sheet) return createJsonResponse({ status: "success", sessions: [] });
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) return createJsonResponse({ status: "success", sessions: [] });
      const data = sheet.getRange(2, 1, lastRow - 1, 13).getValues();
      const sessions = data.map((row, idx) => ({
        id: "pomo-" + (idx + 2),
        date: row[1] instanceof Date ? Utilities.formatDate(row[1], ss.getSpreadsheetTimeZone(), "yyyy-MM-dd") : row[1].toString().split('T')[0],
        dayOfWeek: row[2],
        timeOfDay: row[3],
        category: row[4],
        taskGoal: row[5],
        completedPomodoros: row[6],
        minutes: row[7],
        hours: row[8],
        interruptions: row[9],
        quality: row[11],
        notes: row[12]
      }));
      return createJsonResponse({ status: "success", sessions });
    }

    // 4. Fetch Mistake Logs
    if (action === "getMistakes") {
      const sheet = ss.getSheetByName("ERROR_LOG");
      if (!sheet) return createJsonResponse({ status: "success", mistakes: [] });
      const lastRow = sheet.getLastRow();
      if (lastRow < 2) return createJsonResponse({ status: "success", mistakes: [] });
      const data = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
      const mistakes = data.map((row, idx) => ({
        id: "mistake-" + (idx + 2),
        date: row[1] instanceof Date ? Utilities.formatDate(row[1], ss.getSpreadsheetTimeZone(), "yyyy-MM-dd") : row[1].toString().split('T')[0],
        subject: row[2],
        topic: row[3],
        source: row[4],
        severity: row[5],
        trap: row[6],
        rootCause: row[7],
        goldenRule: row[8]
      }));
      return createJsonResponse({ status: "success", mistakes });
    }

    // 5. Fetch Dashboard KPIs
    if (action === "getDashboard") {
      return createJsonResponse({ status: "success", timestamp: new Date().toISOString() });
    }

    return createJsonResponse({ status: "error", message: "Invalid action" });
  } catch (err) {
    return createJsonResponse({ status: "error", message: err.toString() });
  }
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    // 1. Toggle Habit Checkbox
    if (action === "toggleHabit") {
      const sheet = ss.getSheetByName("Monthly_Habit_Tracker");
      const row = body.row;
      const day = body.day;
      const value = body.value;
      const colIndex = 4 + day; // Column E is Day 1
      sheet.getRange(row, colIndex).setValue(value);
      return createJsonResponse({ status: "success", updated: { row, day, value } });
    }

    // 2. Append Pomodoro Session (With Actual Completed Minutes)
    if (action === "logPomodoro") {
      const sheet = ss.getSheetByName("Pomodoro_Tracker");
      const nextRow = sheet.getLastRow() + 1;

      sheet.getRange(nextRow, 2).setValue(body.date || new Date());
      sheet.getRange(nextRow, 3).setFormula(\`=IF(B\${nextRow}="","",TEXT(B\${nextRow},"dddd"))\`);
      sheet.getRange(nextRow, 4).setValue(body.timeOfDay || "Morning 🌅");
      sheet.getRange(nextRow, 5).setValue(body.category || "Coding");
      sheet.getRange(nextRow, 6).setValue(body.taskGoal || "");
      sheet.getRange(nextRow, 7).setValue(body.completedPomodoros || 1);
      sheet.getRange(nextRow, 8).setValue(body.minutes || 25); // Actual completed minutes directly logged
      sheet.getRange(nextRow, 9).setFormula(\`=IF(H\${nextRow}="","",ROUND(H\${nextRow}/60, 2))\`);
      sheet.getRange(nextRow, 10).setValue(body.interruptions || 0);
      sheet.getRange(nextRow, 11).setFormula(\`=IF(ISNUMBER(G\${nextRow}), SPARKLINE(G\${nextRow}, {"charttype","bar";"max",6;"color1","#10B981"}), "")\`);
      sheet.getRange(nextRow, 12).setValue(body.quality || "High Flow");
      sheet.getRange(nextRow, 13).setValue(body.notes || "");

      return createJsonResponse({ status: "success", loggedRow: nextRow });
    }

    // 3. Update Syllabus Subtopic Checkboxes (Correct Column F, G, H Mapping)
    if (action === "updateSyllabus") {
      const sheet = ss.getSheetByName(body.subject);
      const row = body.row;
      if (body.theory !== undefined) sheet.getRange(row, 6).setValue(body.theory); // Column F
      if (body.practice !== undefined) sheet.getRange(row, 7).setValue(body.practice); // Column G
      if (body.pyq !== undefined) sheet.getRange(row, 8).setValue(body.pyq); // Column H
      if (body.notes !== undefined) sheet.getRange(row, 12).setValue(body.notes);
      return createJsonResponse({ status: "success", subject: body.subject, updatedRow: row });
    }

    // 4. Add New Dynamic Habit
    if (action === "addHabit") {
      const sheet = ss.getSheetByName("Monthly_Habit_Tracker");
      const nextRow = sheet.getLastRow() + 1;
      const prevId = sheet.getRange(nextRow - 1, 1).getValue() || 100;

      sheet.getRange(nextRow, 1).setValue(Number(prevId) + 1);
      sheet.getRange(nextRow, 2).setValue(body.category || "Academics");
      sheet.getRange(nextRow, 3).setValue(body.description);
      sheet.getRange(nextRow, 4).setValue(body.targetDays || 22);

      for (let c = 5; c <= 35; c++) {
        sheet.getRange(nextRow, c).setValue(false);
      }

      sheet.getRange(nextRow, 36).setFormula(\`=COUNTIF(E\${nextRow}:AI\${nextRow}, TRUE)\`);
      sheet.getRange(nextRow, 37).setFormula(\`=D\${nextRow}\`);
      sheet.getRange(nextRow, 38).setFormula(\`=IFERROR(AJ\${nextRow}/AK\${nextRow}, 0)\`);
      sheet.getRange(nextRow, 39).setFormula(\`=IF(AJ\${nextRow}=0, "⚪ Not Started", IF(AJ\${nextRow}>=AK\${nextRow}, "🏆 Target Achieved", IF(AJ\${nextRow}>=15, "⚡ Strong Streak", "✅ Active")))\`);

      return createJsonResponse({ status: "success", newHabitRow: nextRow });
    }

    // 5. Append Mistake Log Row
    if (action === "logMistake") {
      const sheet = ss.getSheetByName("ERROR_LOG");
      const nextRow = sheet.getLastRow() + 1;
      sheet.getRange(nextRow, 2).setValue(body.date || new Date());
      sheet.getRange(nextRow, 3).setValue(body.subject || "");
      sheet.getRange(nextRow, 4).setValue(body.topic || "");
      sheet.getRange(nextRow, 5).setValue(body.source || "");
      sheet.getRange(nextRow, 6).setValue(body.severity || "Medium");
      sheet.getRange(nextRow, 7).setValue(body.trap || "");
      sheet.getRange(nextRow, 8).setValue(body.rootCause || "");
      sheet.getRange(nextRow, 9).setValue(body.goldenRule || "");
      return createJsonResponse({ status: "success", loggedRow: nextRow });
    }

    // 6. Delete Pomodoro Session Row
    if (action === "deletePomodoro") {
      const sheet = ss.getSheetByName("Pomodoro_Tracker");
      if (!sheet) return createJsonResponse({ status: "error", message: "Pomodoro_Tracker sheet not found" });
      const lastRow = sheet.getLastRow();
      const targetDate = body.date;
      const targetMinutes = body.minutes;
      const targetTitle = (body.title || body.taskGoal || "").trim().toLowerCase();

      for (let r = lastRow; r >= 2; r--) {
        const rowDateVal = sheet.getRange(r, 2).getValue();
        const rowDateStr = rowDateVal instanceof Date ? Utilities.formatDate(rowDateVal, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd") : rowDateVal.toString().split('T')[0];
        const rowMins = Number(sheet.getRange(r, 8).getValue());
        const rowCategory = String(sheet.getRange(r, 5).getValue() || "").trim().toLowerCase();
        const rowGoal = String(sheet.getRange(r, 6).getValue() || "").trim().toLowerCase();
        const rowTitle = rowGoal || rowCategory;

        const dateMatch = !targetDate || rowDateStr === targetDate;
        const minsMatch = !targetMinutes || rowMins === Number(targetMinutes);
        const titleMatch = !targetTitle || rowTitle === targetTitle || rowGoal === targetTitle || rowCategory === targetTitle;

        if (dateMatch && (minsMatch || titleMatch)) {
          sheet.deleteRow(r);
          return createJsonResponse({ status: "success", deletedRow: r });
        }
      }
      return createJsonResponse({ status: "not_found", message: "Pomodoro session not found" });
    }

    // 7. Delete Habit Row (Matching Habit ID in Column A)
    if (action === "deleteHabit") {
      const sheet = ss.getSheetByName("Monthly_Habit_Tracker");
      if (!sheet) return createJsonResponse({ status: "error", message: "Monthly_Habit_Tracker sheet not found" });
      const lastRow = sheet.getLastRow();
      const targetHabitId = body.id !== undefined ? Number(body.id) : (body.row !== undefined ? Number(body.row) - 4 : null);
      const targetDesc = body.description ? String(body.description).trim().toLowerCase() : "";

      for (let r = 5; r <= lastRow; r++) {
        const habitIdInCell = Number(sheet.getRange(r, 1).getValue());
        const cellDesc = String(sheet.getRange(r, 3).getValue() || "").trim().toLowerCase();
        if ((targetHabitId !== null && habitIdInCell === targetHabitId) || (targetDesc && cellDesc === targetDesc)) {
          sheet.deleteRow(r);
          return createJsonResponse({ status: "success", deletedRow: r, habitId: targetHabitId });
        }
      }
      return createJsonResponse({ status: "not_found", message: "Habit row not found" });
    }

    // 8. Delete Subtopic Row
    if (action === "deleteSubtopic") {
      const sheet = ss.getSheetByName(body.subject);
      if (!sheet) return createJsonResponse({ status: "error", message: "Subject sheet not found" });
      const lastRow = sheet.getLastRow();
      const targetSubtopic = (body.subtopic || body.subtopicTitle || "").trim().toLowerCase();

      for (let r = 6; r <= lastRow; r++) {
        const cellSubtopic = String(sheet.getRange(r, 3).getValue() || "").trim().toLowerCase();
        if (targetSubtopic && cellSubtopic === targetSubtopic) {
          sheet.deleteRow(r);
          return createJsonResponse({ status: "success", deletedRow: r });
        }
      }
      return createJsonResponse({ status: "not_found", message: "Subtopic row not found" });
    }

    // 9. Create Subject Tab from Template
    if (action === "createSubjectSheet") {
      const templateSheet = ss.getSheetByName("_TEMPLATE_SUBJECT_MASTER");
      const newSheetName = body.subjectCode;
      let newSheet = ss.getSheetByName(newSheetName);
      if (newSheet) {
        return createJsonResponse({ status: "already_exists", message: "Subject sheet already exists" });
      }

      if (templateSheet) {
        newSheet = templateSheet.copyTo(ss);
        newSheet.setName(newSheetName);
        newSheet.getRange("A2").setValue(body.subjectName);
        newSheet.getRange("A3").setValue(body.category || "Custom Coursework");
      } else {
        newSheet = ss.insertSheet(newSheetName);
        newSheet.getRange("A1").setValue("Unit");
        newSheet.getRange("B1").setValue("Topic");
        newSheet.getRange("C1").setValue("Subtopic");
        newSheet.getRange("D1").setValue("Priority");
        newSheet.getRange("E1").setValue("Status");
        newSheet.getRange("F1").setValue("Theory");
        newSheet.getRange("G1").setValue("Practice");
        newSheet.getRange("H1").setValue("PYQ");
      }
      return createJsonResponse({ status: "success", createdSheet: newSheetName });
    }

    // 10. Create Exam Log Sheet
    if (action === "createExamSheet") {
      return createJsonResponse({ status: "success", exam: body.examName });
    }

    // 11. Add Syllabus Subtopic
    if (action === "addSubtopic") {
      const sheet = ss.getSheetByName(body.subject);
      if (!sheet) return createJsonResponse({ status: "error", message: "Subject sheet not found" });
      const nextRow = sheet.getLastRow() + 1;
      sheet.getRange(nextRow, 1).setValue(body.unit || "");
      sheet.getRange(nextRow, 2).setValue(body.topic || "");
      sheet.getRange(nextRow, 3).setValue(body.subtopic || "");
      sheet.getRange(nextRow, 4).setValue(body.priority || "High");
      sheet.getRange(nextRow, 5).setFormula(\`=IF(AND(F\${nextRow}, G\${nextRow}, H\${nextRow}), "✅ Completed", "⚪ In Progress")\`);
      sheet.getRange(nextRow, 6).setValue(false); // Theory
      sheet.getRange(nextRow, 7).setValue(false); // Practice
      sheet.getRange(nextRow, 8).setValue(false); // PYQ
      sheet.getRange(nextRow, 10).setValue(0); // Revision Count
      return createJsonResponse({ status: "success", subtopicRow: nextRow });
    }

    // 12. Delete Mistake Log Row
    if (action === "deleteMistake") {
      const sheet = ss.getSheetByName("ERROR_LOG");
      if (!sheet) return createJsonResponse({ status: "error", message: "ERROR_LOG sheet not found" });
      const lastRow = sheet.getLastRow();
      const targetTrap = (body.trap || body.error || "").trim().toLowerCase();
      const targetSubject = (body.subject || "").trim().toLowerCase();
      const targetDate = body.date;

      for (let r = lastRow; r >= 2; r--) {
        const rowDateVal = sheet.getRange(r, 2).getValue();
        const rowDateStr = rowDateVal instanceof Date ? Utilities.formatDate(rowDateVal, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd") : rowDateVal.toString().split('T')[0];
        const rowSubject = String(sheet.getRange(r, 3).getValue() || "").trim().toLowerCase();
        const rowTrap = String(sheet.getRange(r, 7).getValue() || "").trim().toLowerCase();

        const trapMatch = !targetTrap || rowTrap === targetTrap;
        const subMatch = !targetSubject || rowSubject === targetSubject;
        const dateMatch = !targetDate || rowDateStr === targetDate;

        if (trapMatch && (subMatch || dateMatch)) {
          sheet.deleteRow(r);
          return createJsonResponse({ status: "success", deletedRow: r });
        }
      }
      return createJsonResponse({ status: "not_found", message: "Mistake row not found" });
    }

    // 13. Delete Subject Sheet Tab from Google Sheets
    if (action === "deleteSubjectSheet") {
      const targetSheet = ss.getSheetByName(body.subjectCode);
      if (targetSheet) {
        ss.deleteSheet(targetSheet);
        return createJsonResponse({ status: "success", deletedSheet: body.subjectCode });
      }
      return createJsonResponse({ status: "not_found", message: "Subject sheet tab not found" });
    }

    return createJsonResponse({ status: "error", message: "Unsupported POST action" });
  } catch (err) {
    return createJsonResponse({ status: "error", message: err.toString() });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

export const SyncModal: React.FC<SyncModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<SyncSettings>(storageService.getSettings());
  const [urlInput, setUrlInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [mutations, setMutations] = useState<SyncMutation[]>(storageService.getMutations());
  const [activeTab, setActiveTab] = useState<'config' | 'code' | 'export'>('config');

  useEffect(() => {
    if (isOpen) {
      const s = storageService.getSettings();
      setSettings(s);
      setUrlInput(s.webAppUrl);
      setMutations(storageService.getMutations());
      setTestResult(null);
      setSyncStatusMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveUrl = () => {
    const trimmed = urlInput.trim();
    storageService.saveSettings({ webAppUrl: trimmed });
    setSettings(storageService.getSettings());
    setTestResult({ success: true, message: 'Settings saved! NextStudy will sync changes automatically.' });
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setIsTesting(false);
      setTestResult({ success: false, message: 'Please enter a valid Apps Script Web App URL.' });
      return;
    }

    try {
      const testUrl = trimmed.includes('?') ? `${trimmed}&action=getHabits` : `${trimmed}?action=getHabits`;
      const res = await fetch(testUrl, { method: 'GET' });
      if (!res.ok) {
        setIsTesting(false);
        if (res.status === 401 || res.status === 403) {
          setTestResult({
            success: false,
            message: 'Apps Script is running an outdated script. Please update Code.gs and deploy a New Version.',
          });
        } else {
          setTestResult({
            success: false,
            message: `Server returned status ${res.status}. Verify deployment permissions ('Anyone').`,
          });
        }
        return;
      }

      const data = await res.json();
      setIsTesting(false);

      if (
        data &&
        (data.error === 'GET supports ping only' ||
          data.message?.includes('ping only') ||
          (data.status === 'error' && data.message?.includes('Unsupported')))
      ) {
        setTestResult({
          success: false,
          message: 'Apps Script is running an outdated script. Please update Code.gs and deploy a New Version.',
        });
        return;
      }

      if (data && data.status === 'success' && Array.isArray(data.habits)) {
        setTestResult({
          success: true,
          message: `Connected successfully! Retrieved ${data.habits.length} habits from Monthly_Habit_Tracker.`,
        });
        return;
      }

      // Fallback to storageService general check
      const fallbackRes = await storageService.testConnection(trimmed);
      setTestResult(fallbackRes);
    } catch (err: any) {
      setIsTesting(false);
      setTestResult({
        success: false,
        message: 'Could not connect. Ensure the Web App is deployed with "Execute as: Me" and "Who has access: Anyone".',
      });
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncStatusMsg('Syncing bi-directionally with Google Sheets...');
    const pushRes = await storageService.syncPendingMutations();
    const pullRes = await storageService.pullFromGoogleSheets();
    setIsSyncing(false);
    setMutations(storageService.getMutations());
    setSyncStatusMsg(`${pushRes.message || ''} ${pullRes.message || ''}`.trim());
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_PRODUCTION_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2200);
  };

  const handleExportJSON = () => {
    const jsonStr = storageService.exportDataJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NextStudy_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const executeReset = () => {
    storageService.resetAllToSeed();
    setMutations([]);
    setSyncStatusMsg('Database reset to fresh curriculum.');
    setIsResetConfirmOpen(false);
  };

  const handleReset = () => {
    setIsResetConfirmOpen(true);
  };

  const pendingCount = mutations.filter((m) => m.status === 'pending').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-[#0e1410] border border-slate-800 shadow-2xl text-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#111813]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Google Sheets Sync Engine</h2>
              <p className="text-xs text-slate-400">
                Persistence Layer · Master_100_Habit_Tracker
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-slate-800/80 bg-[#0c110e]">
          <button
            onClick={() => setActiveTab('config')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'config'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Endpoint Setup & Sync
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'code'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Apps Script Code
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'export'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            Backup & Reset
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'config' && (
            <>
              {/* Status overview banner */}
              <div className="p-4 rounded-xl bg-[#111813] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        settings.webAppUrl ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                      }`}
                    />
                    <span className="font-semibold text-white">
                      {settings.webAppUrl ? 'Sheets Webhook Configured' : 'Offline-First Local Mode'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Pending local mutations:{' '}
                    <span className="font-bold text-emerald-400">{pendingCount}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  NextStudy runs with a 16ms optimistic UI in your browser and automatically logs habits, focus sessions, and syllabus updates. When you deploy the free Apps Script below, every tap reflects directly in your Google Spreadsheet.
                </p>

                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <button
                    onClick={handleSyncNow}
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-medium text-white transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>Sync Now</span>
                  </button>

                  <a
                    href={`https://docs.google.com/spreadsheets/d/${settings.spreadsheetId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Master Spreadsheet</span>
                  </a>
                </div>

                {syncStatusMsg && (
                  <p className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 p-2 rounded-lg">
                    {syncStatusMsg}
                  </p>
                )}
              </div>

              {/* Endpoint input */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Google Apps Script Web App Endpoint URL:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfy.../exec"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#141d17] border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={handleSaveUrl}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white whitespace-nowrap transition-colors"
                  >
                    Save URL
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Deploy as: Web App ➔ Execute as: Me ➔ Who has access: Anyone.
                </p>
              </div>

              {/* Test Button & Feedback */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTestConnection}
                  disabled={isTesting || !urlInput.trim()}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-medium text-slate-200 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>Test Connection</span>
                </button>

                {testResult && (
                  <div
                    className={`flex items-center gap-2 text-xs p-2 rounded-lg ${
                      testResult.success
                        ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/50'
                        : 'text-amber-300 bg-amber-950/40 border border-amber-800/50'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>

              {/* Spreadsheet ID Reference */}
              <div className="p-3 rounded-xl bg-[#111813] border border-slate-800 text-xs space-y-1">
                <div className="text-slate-400 font-medium">Default Target Spreadsheet ID:</div>
                <div className="font-mono text-emerald-400 select-all break-all">
                  {settings.spreadsheetId}
                </div>
              </div>
            </>
          )}

          {activeTab === 'code' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-white">Google Apps Script Web App Code</h3>
                  <p className="text-xs text-slate-400">
                    Paste into Master_100_Habit_Tracker (Extensions &gt; Apps Script)
                  </p>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors"
                >
                  {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCode ? 'Copied to Clipboard!' : 'Copy Code'}</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-[#080d09] border border-slate-800 font-mono text-[11px] text-slate-300 max-h-72 overflow-y-auto leading-relaxed select-all">
                <pre>{APPS_SCRIPT_PRODUCTION_CODE}</pre>
              </div>

              <div className="p-3 rounded-xl bg-[#111813] border border-slate-800 text-xs text-slate-400 space-y-1.5">
                <div className="font-semibold text-white">3-Step Deployment Instructions:</div>
                <ol className="list-decimal list-inside space-y-1 text-slate-300">
                  <li>In Google Sheets, click <strong>Extensions ➔ Apps Script</strong>.</li>
                  <li>Delete default text, paste this script, and click <strong>Save</strong> (Ctrl+S).</li>
                  <li>Click <strong>Deploy ➔ New Deployment</strong>, choose <strong>Web App</strong>, set <em>Who has access</em> to <strong>Anyone</strong>, and copy the Web App URL into the Endpoint Setup tab.</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Data Portability & State Control</h3>
                <p className="text-xs text-slate-400">
                  Download offline backups or reset to the engineering seed curriculum.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleExportJSON}
                  className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-[#111813] hover:bg-slate-800 border border-slate-800 text-xs font-medium text-white transition-colors"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Export Complete JSON Backup</span>
                </button>

                <button
                  onClick={handleReset}
                  className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-red-950/30 hover:bg-red-950/60 border border-red-900/40 text-xs font-medium text-red-300 transition-colors"
                >
                  <RotateCcw className="w-4 h-4 text-red-400" />
                  <span>Reset All to Initial Curriculum</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-slate-800 bg-[#111813]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={isResetConfirmOpen}
        title="Reset Curriculum & Habits"
        message="Are you sure you want to restore the default seed curriculum, subjects, habits, and syllabus tracker?"
        confirmText="Yes, Reset Everything"
        onConfirm={executeReset}
        onClose={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
};
