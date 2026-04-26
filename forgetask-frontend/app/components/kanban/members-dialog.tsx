"use client";

import { useState } from 'react';
import { Task } from './task-card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Users, TrendingUp, UserPlus, Mail, Link as LinkIcon, Check, Copy, ArrowLeft, Loader2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { getApiBaseUrl } from '@/app/services/apiBaseUrl';

interface MembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  projectId?: number; // Añadido para saber a qué proyecto invitar
}

interface MemberStats {
  key: string;
  name: string;
  username?: string;
  role?: string;
  productivity: number;
  completedTasks: number;
  totalEstimated: number;
  totalReal: number;
}

export function MembersDialog({ open, onOpenChange, tasks, projectId }: MembersDialogProps) {
  // Manejo de vistas dentro del dialog
  // 'list' = lista de miembros
  // 'invite-form' = formulario para ingresar email
  // 'invite-success' = mostrar el link generado
  const [view, setView] = useState<'list' | 'invite-form' | 'invite-success'>('list');
  
  // Estado para la invitación
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'developer' | 'manager'>('developer');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  // Al cerrar el dialog, resetear la vista
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setTimeout(() => {
        setView('list');
        setInviteEmail('');
        setError(null);
        setCopied(false);
      }, 300);
    }
    onOpenChange(isOpen);
  };

  // Función para crear la invitación en el backend
  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.includes('@') || !projectId) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No hay sesión activa");

      const response = await fetch(`${getApiBaseUrl()}/api/invites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          idProject: projectId
        })
      });

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error("Ya existe una invitación pendiente para este correo en este proyecto.");
        }
        throw new Error("Error al generar la invitación");
      }

      const data = await response.json();
      
      // Construir la URL completa para el link
      const baseUrl = window.location.origin;
      setGeneratedLink(`${baseUrl}${data.inviteLink}`);
      setView('invite-success');
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  // Cálculos originales de la lista de miembros
  const memberStatsMap = new Map<string, MemberStats>();
  tasks.forEach((task) => {
    if (task.status === 'done' && task.assignedTo && task.assignedTo.length > 0) {
      const memberName = task.assignedTo[0];
      const memberKey = task.assignedUsername || memberName;

      if (!memberStatsMap.has(memberKey)) {
        memberStatsMap.set(memberKey, {
          key: memberKey,
          name: memberName,
          username: task.assignedUsername,
          role: task.assignedRole,
          productivity: 0,
          completedTasks: 0,
          totalEstimated: 0,
          totalReal: 0,
        });
      }
      const stats = memberStatsMap.get(memberKey)!;
      stats.completedTasks += 1;
      stats.totalEstimated += task.estimatedTime || 0;
      stats.totalReal += task.realTime || 0;

      if (!stats.username && task.assignedUsername) stats.username = task.assignedUsername;
      if (!stats.role && task.assignedRole) stats.role = task.assignedRole;
    }
  });

  const membersStats = Array.from(memberStatsMap.values()).map((stats) => {
    const productivity = stats.totalReal > 0
      ? Math.round((stats.totalEstimated / stats.totalReal) * 100)
      : 100;
    return { ...stats, productivity };
  });

  membersStats.sort((a, b) => b.productivity - a.productivity);

  const getProductivityColor = (productivity: number) => {
    if (productivity >= 100) return 'bg-[#e76b36]/15 text-[#e76b36] border-[#e76b36]/40';
    if (productivity >= 80) return 'bg-[#f19367]/15 text-[#f19367] border-[#f19367]/35';
    return 'bg-[#1f2937] text-[#9aa4b2] border-[#2b3542]';
  };

  const getProductivityLabel = (productivity: number) => {
    if (productivity >= 120) return 'Excellent';
    if (productivity >= 100) return 'Great';
    if (productivity >= 80) return 'Good';
    return 'Needs Improvement';
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] border-[#2b3542] bg-[#0D1117] text-[#e6edf3] p-0 overflow-hidden">
        
        {/* ── VISTA 1: LISTA DE MIEMBROS ── */}
        {view === 'list' && (
          <>
            <DialogHeader className="p-6 pb-4 border-b border-[#2b3542]/50">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-white">
                    <Users className="h-5 w-5 text-[#e76b36]" />
                    Team Members
                  </DialogTitle>
                  <DialogDescription className="text-[#9aa4b2] mt-1.5">
                    View team members and their productivity metrics
                  </DialogDescription>
                </div>
                {projectId && (
                  <Button 
                    onClick={() => setView('invite-form')}
                    className="bg-[#e76b36] hover:bg-[#ff8a58] text-white h-9 px-3 gap-2 shrink-0 transition-colors"
                  >
                    <UserPlus className="h-4 w-4" />
                    Invite
                  </Button>
                )}
              </div>
            </DialogHeader>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {membersStats.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-[#9aa4b2]">
                  <div className="bg-[#1a222d] p-4 rounded-full mb-3">
                    <Users className="h-8 w-8 text-[#2b3542]" />
                  </div>
                  <p>No completed tasks yet to calculate productivity</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {membersStats.map((member) => (
                    <div
                      key={member.key}
                      className="flex flex-col gap-3 rounded-xl border border-[#2b3542] bg-[#11161f] p-4 transition-colors hover:border-[#30363d]"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-white">{member.name}</h4>
                          <div className="mt-1 flex items-center gap-2 text-xs text-[#9aa4b2]">
                            <span className="font-medium">
                              {member.completedTasks} completed {member.completedTasks === 1 ? 'task' : 'tasks'}
                            </span>
                            {(member.username || member.role) && (
                              <>
                                <span className="opacity-50">•</span>
                                <span>
                                  {member.role ? `${member.role}` : ''}
                                  {member.username && member.role ? ' ' : ''}
                                  {member.username ? `(@${member.username})` : ''}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <Badge
                            variant="outline"
                            className={`flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold ${getProductivityColor(
                              member.productivity
                            )}`}
                          >
                            <TrendingUp className="h-3 w-3" />
                            {member.productivity}%
                          </Badge>
                          <span className="text-[10px] uppercase tracking-wider text-[#9aa4b2] font-semibold">
                            {getProductivityLabel(member.productivity)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 rounded-lg bg-[#0D1117] p-3 text-sm border border-[#2b3542]/30">
                        <div className="flex flex-col">
                          <span className="text-[#9aa4b2] text-xs font-medium mb-1">Estimated Time</span>
                          <span className="font-semibold text-white">{member.totalEstimated}h</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[#9aa4b2] text-xs font-medium mb-1">Real Time</span>
                          <span className="font-semibold text-white">{member.totalReal}h</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── VISTA 2: FORMULARIO DE INVITACIÓN ── */}
        {view === 'invite-form' && (
          <>
            <DialogHeader className="p-6 pb-0">
              <div className="flex items-center gap-2 mb-4">
                <button 
                  onClick={() => setView('list')}
                  className="p-1.5 -ml-1.5 rounded-md hover:bg-[#1a222d] text-[#9aa4b2] hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <DialogTitle className="text-xl font-semibold text-white">
                  Invite Member
                </DialogTitle>
              </div>
              <DialogDescription className="text-[#9aa4b2]">
                Send an invitation link to add a new member to this project.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateInvite} className="p-6 space-y-5">
              {error && (
                <div className="p-3 text-sm rounded-md bg-red-500/10 border border-red-500/20 text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-2.5">
                <Label htmlFor="email" className="text-[#e6edf3]">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9aa4b2]" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="developer@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    className="pl-9 bg-[#11161f] border-[#2b3542] text-white focus-visible:border-[#e76b36] focus-visible:ring-1 focus-visible:ring-[#e76b36]"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <Label className="text-[#e6edf3]">Role</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => setInviteRole('developer')}
                    className={`cursor-pointer rounded-lg border p-3 flex flex-col gap-1 transition-colors ${
                      inviteRole === 'developer' 
                        ? 'bg-[#e76b36]/10 border-[#e76b36] text-white' 
                        : 'bg-[#11161f] border-[#2b3542] text-[#9aa4b2] hover:border-[#30363d]'
                    }`}
                  >
                    <span className="text-sm font-semibold">Developer</span>
                    <span className="text-xs opacity-80">Can manage tasks and sprints</span>
                  </div>
                  <div 
                    onClick={() => setInviteRole('manager')}
                    className={`cursor-pointer rounded-lg border p-3 flex flex-col gap-1 transition-colors ${
                      inviteRole === 'manager' 
                        ? 'bg-[#e76b36]/10 border-[#e76b36] text-white' 
                        : 'bg-[#11161f] border-[#2b3542] text-[#9aa4b2] hover:border-[#30363d]'
                    }`}
                  >
                    <span className="text-sm font-semibold">Manager</span>
                    <span className="text-xs opacity-80">Full access to project settings</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setView('list')}
                  className="border-[#2b3542] hover:bg-[#1a222d] text-white"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading || !inviteEmail}
                  className="bg-[#e76b36] hover:bg-[#ff8a58] text-white min-w-[120px]"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate Link'}
                </Button>
              </div>
            </form>
          </>
        )}

        {/* ── VISTA 3: ÉXITO (LINK GENERADO) ── */}
        {view === 'invite-success' && (
          <div className="p-8 text-center space-y-6">
            <div className="mx-auto w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mb-2">
              <Check className="h-6 w-6 text-green-400" />
            </div>
            
            <div>
              <DialogTitle className="text-xl font-semibold text-white mb-2">
                Invitation Created
              </DialogTitle>
              <p className="text-sm text-[#9aa4b2]">
                Share this link with <strong>{inviteEmail}</strong> to join as {inviteRole}.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-[#11161f] border border-[#2b3542] p-2 rounded-lg">
              <div className="bg-[#1a222d] p-2 rounded-md shrink-0">
                <LinkIcon className="h-4 w-4 text-[#9aa4b2]" />
              </div>
              <div className="truncate text-sm text-left text-[#e6edf3] flex-1 px-1 select-all">
                {generatedLink}
              </div>
              <Button 
                onClick={copyToClipboard} 
                variant="secondary"
                className={`shrink-0 transition-all ${copied ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-[#1a222d] hover:bg-[#2b3542] text-white'}`}
              >
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>

            <div className="pt-4">
              <Button 
                onClick={() => setView('list')}
                variant="outline"
                className="w-full border-[#2b3542] hover:bg-[#1a222d] text-white"
              >
                Back to Members
              </Button>
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}