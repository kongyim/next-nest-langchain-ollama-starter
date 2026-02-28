'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  LinearProgress,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import DeleteIcon from '@mui/icons-material/Delete';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useColorMode } from '../mui-provider';

interface AdminUser {
  id: string;
  email: string;
  lastLoginAt: string | null;
  createdAt: string;
  _count: {
    sessions: number;
  };
}

interface TrainingEntry {
  id: string;
  title: string;
  content: string;
  status: 'idle' | 'trained';
  createdAt: string;
  updatedAt: string;
  lastTrainedAt: string | null;
}

interface TrainingRun {
  id: string;
  startedAt: string;
  finishedAt: string;
  status: 'completed';
  processedEntries: number;
}

interface TrainingJob {
  id: string;
  entryId: string | null;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  processedEntries: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
}

interface EvalSource {
  id: string;
  title: string;
  score: number;
  snippet: string;
}

interface EvalResult {
  answer: string;
  sources: EvalSource[];
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ??
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : 'http://localhost:3001');

const DRAWER_WIDTH = 260;

type AdminSection = 'users' | 'training';

export default function AdminPage() {
  const { mode, toggleColorMode } = useColorMode();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [trainingEntries, setTrainingEntries] = useState<TrainingEntry[]>([]);
  const [trainingRuns, setTrainingRuns] = useState<TrainingRun[]>([]);
  const [trainingJobs, setTrainingJobs] = useState<TrainingJob[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<AdminSection>('users');

  const [openCreateUser, setOpenCreateUser] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [openResetPassword, setOpenResetPassword] = useState(false);
  const [resetTargetUserId, setResetTargetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  const [openCreateTrainingEntry, setOpenCreateTrainingEntry] = useState(false);
  const [trainingTitle, setTrainingTitle] = useState('');
  const [trainingContent, setTrainingContent] = useState('');
  const [creatingTrainingEntry, setCreatingTrainingEntry] = useState(false);
  const [runningTraining, setRunningTraining] = useState(false);
  const [uploadingTrainingFile, setUploadingTrainingFile] = useState(false);
  const [evalQuery, setEvalQuery] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const trainingFileInputRef = useRef<HTMLInputElement | null>(null);

  const authHeaders = (adminToken: string): HeadersInit => ({
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
  });

  const getNetworkErrorMessage = useCallback((err: unknown, fallback: string) => {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      return `Cannot reach backend at ${API_URL}. Ensure backend is running on port 3001.`;
    }

    return err instanceof Error ? err.message : fallback;
  }, []);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
  };

  const clearSuccess = () => {
    setSuccessMessage(null);
  };

  const loadUsers = useCallback(async (adminToken: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/admin/users`, {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load users.');
      }

      const data = (await response.json()) as AdminUser[];
      setUsers(data);
    } catch (err) {
      const message = getNetworkErrorMessage(err, 'Failed to load users.');
      setError(message);
      setToken(null);
      window.localStorage.removeItem('admin_token');
    } finally {
      setLoading(false);
    }
  }, [getNetworkErrorMessage]);

  const loadTraining = useCallback(async (adminToken: string) => {
    try {
      const [entriesResponse, runsResponse, jobsResponse] = await Promise.all([
        fetch(`${API_URL}/admin/training/entries`, {
          cache: 'no-store',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }),
        fetch(`${API_URL}/admin/training/runs`, {
          cache: 'no-store',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }),
        fetch(`${API_URL}/admin/training/jobs`, {
          cache: 'no-store',
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }),
      ]);

      if (!entriesResponse.ok || !runsResponse.ok || !jobsResponse.ok) {
        throw new Error('Failed to load training data.');
      }

      const entries = (await entriesResponse.json()) as TrainingEntry[];
      const runs = (await runsResponse.json()) as TrainingRun[];
      const jobs = (await jobsResponse.json()) as TrainingJob[];
      setTrainingEntries(entries);
      setTrainingRuns(runs);
      setTrainingJobs(jobs);
    } catch (err) {
      const message = getNetworkErrorMessage(err, 'Failed to load training data.');
      setError(message);
    }
  }, [getNetworkErrorMessage]);

  useEffect(() => {
    const stored = window.localStorage.getItem('admin_token');
    if (!stored) return;
    setToken(stored);
    void loadUsers(stored);
    void loadTraining(stored);
  }, [loadTraining, loadUsers]);

  useEffect(() => {
    if (!token) return;
    if (activeSection !== 'training') return;

    const hasActiveJob = trainingJobs.some((job) => job.status === 'queued' || job.status === 'running');
    if (!hasActiveJob) return;

    const timer = setInterval(() => {
      void loadTraining(token);
    }, 2000);

    return () => clearInterval(timer);
  }, [activeSection, loadTraining, token, trainingJobs]);

  const onLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = (await response.json()) as { token?: string; message?: string };
      if (!response.ok || !data.token) {
        throw new Error(data.message ?? 'Invalid admin credentials.');
      }

      setToken(data.token);
      window.localStorage.setItem('admin_token', data.token);
      await Promise.all([loadUsers(data.token), loadTraining(data.token)]);
    } catch (err) {
      const message = getNetworkErrorMessage(err, 'Login failed.');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async () => {
    if (!token) return;

    setCreatingUser(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/admin/users`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ email: newEmail, password: newPassword }),
      });

      const data = (await response.json()) as AdminUser & { message?: string };

      if (!response.ok || !data.id) {
        throw new Error(data.message ?? 'Failed to create user.');
      }

      setOpenCreateUser(false);
      setNewEmail('');
      setNewPassword('');
      await loadUsers(token);
      showSuccess('User created successfully.');
    } catch (err) {
      const message = getNetworkErrorMessage(err, 'Failed to create user.');
      setError(message);
    } finally {
      setCreatingUser(false);
    }
  };

  const resetUserPassword = async () => {
    if (!token || !resetTargetUserId) return;

    setResettingPassword(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/admin/users/${resetTargetUserId}/reset-password`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ password: resetPassword }),
      });

      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message ?? 'Failed to reset password.');
      }

      setOpenResetPassword(false);
      setResetTargetUserId(null);
      setResetPassword('');
      showSuccess('Password updated successfully.');
    } catch (err) {
      const message = getNetworkErrorMessage(err, 'Failed to reset password.');
      setError(message);
    } finally {
      setResettingPassword(false);
    }
  };

  const createTrainingEntry = async () => {
    if (!token) return;

    setCreatingTrainingEntry(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/admin/training/entries`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ title: trainingTitle, content: trainingContent }),
      });

      const data = (await response.json()) as TrainingEntry & { message?: string };
      if (!response.ok || !data.id) {
        throw new Error(data.message ?? 'Failed to create training entry.');
      }

      setOpenCreateTrainingEntry(false);
      setTrainingTitle('');
      setTrainingContent('');
      await loadTraining(token);
      showSuccess('Training data added successfully.');
    } catch (err) {
      const message = getNetworkErrorMessage(err, 'Failed to create training entry.');
      setError(message);
    } finally {
      setCreatingTrainingEntry(false);
    }
  };

  const uploadTrainingFile = async (file: File) => {
    if (!token) return;

    setUploadingTrainingFile(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/admin/training/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = (await response.json()) as TrainingEntry & { message?: string };
      if (!response.ok || !data.id) {
        throw new Error(data.message ?? 'Failed to upload training file.');
      }

      await loadTraining(token);
      showSuccess('File uploaded successfully.');
    } catch (err) {
      const message = getNetworkErrorMessage(err, 'Failed to upload training file.');
      setError(message);
    } finally {
      setUploadingTrainingFile(false);
    }
  };

  const runTraining = async (entryId?: string) => {
    if (!token) return;

    setRunningTraining(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/admin/training/run`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ entryId }),
      });

      const data = (await response.json()) as TrainingJob & { message?: string };
      if (!response.ok || !data.id) {
        throw new Error(data.message ?? 'Failed to run training.');
      }

      setTrainingJobs((prev) => [data, ...prev]);
      await loadTraining(token);
      showSuccess('Training job queued successfully.');
    } catch (err) {
      const message = getNetworkErrorMessage(err, 'Failed to run training.');
      setError(message);
    } finally {
      setRunningTraining(false);
    }
  };

  const runEval = async () => {
    if (!token) return;
    if (!evalQuery.trim()) return;

    setIsEvaluating(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/admin/training/eval`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ query: evalQuery, limit: 3 }),
      });

      const data = (await response.json()) as EvalResult & { message?: string };
      if (!response.ok || !data.answer) {
        throw new Error(data.message ?? 'Failed to run eval.');
      }

      setEvalResult(data);
    } catch (err) {
      const message = getNetworkErrorMessage(err, 'Failed to run eval.');
      setError(message);
    } finally {
      setIsEvaluating(false);
    }
  };

  const deleteTrainingEntry = async (entryId: string) => {
    if (!token) return;

    const response = await fetch(`${API_URL}/admin/training/entries/${entryId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      setError('Failed to delete training entry.');
      return;
    }

    setTrainingEntries((prev) => prev.filter((entry) => entry.id !== entryId));
    showSuccess('Training entry deleted successfully.');
  };

  const deleteUser = async (userId: string) => {
    if (!token) return;

    const confirmed = window.confirm('Delete this user and all their chats?');
    if (!confirmed) return;

    const response = await fetch(`${API_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      setError('Failed to delete user.');
      return;
    }

    setUsers((prev) => prev.filter((user) => user.id !== userId));
    showSuccess('User deleted successfully.');
  };

  const logout = () => {
    setToken(null);
    setUsers([]);
    setTrainingEntries([]);
    setTrainingRuns([]);
    setTrainingJobs([]);
    setEvalResult(null);
    setError(null);
    window.localStorage.removeItem('admin_token');
  };

  if (!token) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
        <Paper elevation={2} sx={{ width: '100%', maxWidth: 420, p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="h5" fontWeight={700}>
              Admin Login
            </Typography>
            <IconButton onClick={toggleColorMode} aria-label="Toggle dark mode">
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter admin credentials configured in environment variables.
          </Typography>

          <Stack component="form" spacing={1.5} onSubmit={onLogin}>
            <TextField
              label="Username"
              size="small"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <TextField
              label="Password"
              type="password"
              size="small"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? 'Logging in...' : 'Log in'}
            </Button>
          </Stack>

          {error && (
            <Typography color="error" variant="body2" sx={{ mt: 1.5 }}>
              {error}
            </Typography>
          )}
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Toolbar>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
              <Typography variant="h6" fontWeight={700}>
                Admin Panel
              </Typography>
              <IconButton size="small" onClick={toggleColorMode} aria-label="Toggle dark mode">
                {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
              </IconButton>
            </Stack>
          </Toolbar>
          <List>
            <ListItemButton
              selected={activeSection === 'users'}
              onClick={() => {
                setActiveSection('users');
                void loadUsers(token);
              }}
            >
              <ListItemText primary="User Management" />
            </ListItemButton>
            <ListItemButton
              selected={activeSection === 'training'}
              onClick={() => {
                setActiveSection('training');
                void loadTraining(token);
              }}
            >
              <ListItemText primary="Model Training" />
            </ListItemButton>
          </List>
          <Box sx={{ mt: 'auto', p: 2 }}>
            <Button variant="outlined" color="inherit" fullWidth onClick={logout}>
              Logout
            </Button>
          </Box>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flex: 1, p: 3 }}>
        {activeSection === 'users' && (
          <Paper sx={{ p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h5" fontWeight={700}>
                User Management
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button variant="contained" onClick={() => setOpenCreateUser(true)}>
                  Create User
                </Button>
                <Button variant="outlined" onClick={() => void loadUsers(token)} disabled={loading}>
                  Refresh
                </Button>
              </Stack>
            </Stack>

            {loading ? (
              <Stack alignItems="center" sx={{ py: 6 }}>
                <CircularProgress size={24} />
              </Stack>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Email</TableCell>
                    <TableCell>Last Login</TableCell>
                    <TableCell>Created At</TableCell>
                    <TableCell>Sessions</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5}>No users found.</TableCell>
                    </TableRow>
                  )}
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}</TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleString()}</TableCell>
                      <TableCell>{user._count.sessions}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              setResetTargetUserId(user.id);
                              setResetPassword('');
                              setOpenResetPassword(true);
                            }}
                          >
                            Reset Password
                          </Button>
                          <IconButton color="error" size="small" onClick={() => void deleteUser(user.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        )}

        {activeSection === 'training' && (
          <Stack spacing={2}>
            <Paper sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="h5" fontWeight={700}>
                  Model Training
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button variant="contained" onClick={() => setOpenCreateTrainingEntry(true)}>
                    Add Training Data
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => trainingFileInputRef.current?.click()}
                    disabled={uploadingTrainingFile}
                  >
                    {uploadingTrainingFile ? 'Uploading...' : 'Upload File'}
                  </Button>
                  <Button variant="outlined" onClick={() => void runTraining()} disabled={runningTraining || trainingEntries.length === 0}>
                    {runningTraining ? 'Running...' : 'Run Training'}
                  </Button>
                </Stack>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                This first version stores training data and tracks training runs. You can extend this to real RAG indexing or model fine-tuning later.
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Supported file types: .txt, .md, .csv, .json (max 2MB)
              </Typography>
            </Paper>

            <Paper sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                Training Data
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Last Trained</TableCell>
                    <TableCell>Updated</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {trainingEntries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5}>No training entries yet.</TableCell>
                    </TableRow>
                  )}
                  {trainingEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.title}</TableCell>
                      <TableCell>{entry.status}</TableCell>
                      <TableCell>{entry.lastTrainedAt ? new Date(entry.lastTrainedAt).toLocaleString() : 'Never'}</TableCell>
                      <TableCell>{new Date(entry.updatedAt).toLocaleString()}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Button size="small" variant="outlined" onClick={() => void runTraining(entry.id)} disabled={runningTraining}>
                            Train
                          </Button>
                          <IconButton color="error" size="small" onClick={() => void deleteTrainingEntry(entry.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>

            <Paper sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                Training Runs
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Run ID</TableCell>
                    <TableCell>Processed Entries</TableCell>
                    <TableCell>Finished At</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {trainingRuns.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4}>No training runs yet.</TableCell>
                    </TableRow>
                  )}
                  {trainingRuns.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>{run.id.slice(0, 8)}</TableCell>
                      <TableCell>{run.processedEntries}</TableCell>
                      <TableCell>{new Date(run.finishedAt).toLocaleString()}</TableCell>
                      <TableCell>{run.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>

            <Paper sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                Job Queue
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Job ID</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Progress</TableCell>
                    <TableCell>Scope</TableCell>
                    <TableCell>Created</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {trainingJobs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5}>No jobs yet.</TableCell>
                    </TableRow>
                  )}
                  {trainingJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>{job.id.slice(0, 8)}</TableCell>
                      <TableCell>{job.status}</TableCell>
                      <TableCell sx={{ minWidth: 180 }}>
                        <Stack spacing={0.5}>
                          <LinearProgress
                            variant="determinate"
                            value={Math.max(0, Math.min(100, job.progress))}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {job.progress}%
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>{job.entryId ? 'Single Entry' : 'All Entries'}</TableCell>
                      <TableCell>{new Date(job.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>

            <Paper sx={{ p: 2.5 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                Eval / Test Console
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Ask a question and preview what your current training data would return.
              </Typography>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
                <TextField
                  fullWidth
                  size="small"
                  label="Test Query"
                  value={evalQuery}
                  onChange={(event) => setEvalQuery(event.target.value)}
                  placeholder="e.g. What is our refund policy?"
                />
                <Button
                  variant="contained"
                  onClick={() => void runEval()}
                  disabled={isEvaluating || !evalQuery.trim()}
                >
                  {isEvaluating ? 'Evaluating...' : 'Run Eval'}
                </Button>
              </Stack>

              {evalResult && (
                <Stack spacing={1} sx={{ mt: 2 }}>
                  <Divider />
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {evalResult.answer}
                  </Typography>
                  <Typography variant="subtitle2">Sources</Typography>
                  {evalResult.sources.length === 0 && (
                    <Typography variant="caption" color="text.secondary">
                      No matched sources.
                    </Typography>
                  )}
                  {evalResult.sources.map((source) => (
                    <Paper key={source.id} variant="outlined" sx={{ p: 1 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {source.title} (score: {source.score})
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {source.snippet}
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Paper>
          </Stack>
        )}

        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 1.5 }}>
            {error}
          </Typography>
        )}
      </Box>

      <Dialog open={openCreateUser} onClose={() => setOpenCreateUser(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Create User</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <TextField
              label="Email"
              type="email"
              size="small"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
            <TextField
              label="Password"
              type="password"
              size="small"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              helperText="At least 6 characters"
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateUser(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => void createUser()}
            disabled={creatingUser || !newEmail.trim() || newPassword.length < 6}
          >
            {creatingUser ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openResetPassword} onClose={() => setOpenResetPassword(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Reset User Password</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <TextField
              label="New Password"
              type="password"
              size="small"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              helperText="At least 6 characters"
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenResetPassword(false);
              setResetTargetUserId(null);
              setResetPassword('');
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void resetUserPassword()}
            disabled={resettingPassword || resetPassword.length < 6}
          >
            {resettingPassword ? 'Updating...' : 'Update Password'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openCreateTrainingEntry} onClose={() => setOpenCreateTrainingEntry(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add Training Data</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <TextField
              label="Title"
              size="small"
              value={trainingTitle}
              onChange={(e) => setTrainingTitle(e.target.value)}
              required
            />
            <TextField
              label="Training Content"
              multiline
              minRows={8}
              value={trainingContent}
              onChange={(e) => setTrainingContent(e.target.value)}
              helperText="Paste knowledge text. Matching snippets are injected into chat responses."
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateTrainingEntry(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => void createTrainingEntry()}
            disabled={creatingTrainingEntry || !trainingTitle.trim() || trainingContent.trim().length < 20}
          >
            {creatingTrainingEntry ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <input
        ref={trainingFileInputRef}
        type="file"
        hidden
        accept=".txt,.md,.csv,.json"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void uploadTrainingFile(file);
          }

          // reset value so selecting same file again still triggers change
          event.currentTarget.value = '';
        }}
      />

      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        onClose={clearSuccess}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={clearSuccess}
          sx={{ width: '100%' }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
