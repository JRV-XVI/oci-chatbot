'use client'

import type * as React from 'react'
import { useState } from 'react'
import { Calendar } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { DatePickerInput } from '../ui/date-picker-input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import sprintService from '@/app/services/sprintService'
import type { SprintOption } from '@/app/types/sprint'

interface AddSprintDialogProps {
  projectId: number | null
  sprintOptions: SprintOption[]
  onSprintSaved: (sprint: SprintOption) => void
  onSprintDeleted: (sprintId: number) => void
}

export function AddSprintDialog({ projectId, sprintOptions, onSprintSaved, onSprintDeleted }: AddSprintDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedSprintId, setSelectedSprintId] = useState('')
  const [sprintNumber, setSprintNumber] = useState('')
  const [goal, setGoal] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const formatSprintLabel = (sprint: SprintOption) => {
    const start = sprint.startDate || '-'
    const end = sprint.endDate || '-'
    return `${sprint.title} (${start} - ${end})`
  }

  const findOverlappingSprint = (nextStartDate: string, nextEndDate: string): SprintOption | undefined => {
    if (!nextStartDate || !nextEndDate) {
      return undefined
    }

    const currentSprintId = selectedSprintId ? Number(selectedSprintId) : null

    return sprintOptions.find((sprint) => {
      if (currentSprintId !== null && sprint.idSprint === currentSprintId) {
        return false
      }

      if (!sprint.startDate || !sprint.endDate) {
        return false
      }

      return nextStartDate <= sprint.endDate && nextEndDate >= sprint.startDate
    })
  }

  const openDialog = () => {
    setSelectedSprintId('')
    setSprintNumber('')
    setGoal('')
    setStartDate('')
    setEndDate('')
    setErrorMessage('')
    setOpen(true)
  }

  const isEditMode = Boolean(selectedSprintId)

  const handleDelete = async () => {
    if (!projectId || !selectedSprintId) {
      return
    }

    const sprintIdNumber = Number(selectedSprintId)
    if (!Number.isFinite(sprintIdNumber)) {
      return
    }

    const ok = window.confirm('Delete this sprint? This cannot be undone.')
    if (!ok) {
      return
    }

    setSubmitting(true)
    try {
      await sprintService.deleteSprint(sprintIdNumber)
      onSprintDeleted(sprintIdNumber)
      setOpen(false)
    } catch (error) {
      console.error('Error deleting sprint:', error)
      window.alert('No se pudo borrar el sprint. Revisa los logs del backend para más detalle.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    if (!projectId) {
      return
    }

    const parsedSprintNumber = sprintNumber.trim() === '' ? NaN : Number(sprintNumber)
    if (!Number.isFinite(parsedSprintNumber) || parsedSprintNumber < 0) {
      setErrorMessage('Sprint number must be greater than or equal to 0.')
      return
    }

    if (startDate && endDate && startDate > endDate) {
      setErrorMessage('Start date cannot be after end date.')
      return
    }

    const overlappingSprint = findOverlappingSprint(startDate, endDate)
    if (overlappingSprint) {
      const overlapRange = `${overlappingSprint.startDate || '-'} - ${overlappingSprint.endDate || '-'}`
      setErrorMessage(`Date range overlaps with ${overlappingSprint.title} (${overlapRange}).`)
      return
    }

    setSubmitting(true)
    try {
      const request = {
        projectId,
        sprintNumber: parsedSprintNumber,
        goal: goal || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }

      const saved = isEditMode
        ? await sprintService.updateSprint(Number(selectedSprintId), request)
        : await sprintService.createSprint(request)

      onSprintSaved(saved)
      setOpen(false)
    } catch (error) {
      console.error('Error saving sprint:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Could not save sprint.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button
        className="gap-2 cursor-pointer"
        variant="outline"
        onClick={openDialog}
        data-testid="btn-check-sprint"
        disabled={!projectId}
        title={!projectId ? 'Project not resolved yet' : 'Create a new sprint'}
      >
        <Calendar className="w-4 h-4" />
        Check Sprint
      </Button>
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-[2px] p-4"
          data-testid="dialog-add-sprint"
        >
          <div className="w-full max-w-[680px] max-h-[90vh] overflow-y-auto rounded-xl border border-[#2b3542] bg-[#0d1117] p-6 shadow-[0_0_24px_rgba(0,0,0,0.35)]">
            <form onSubmit={handleSubmit}>
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#2b3542]">
                <div>
                  <h2 className="text-xl font-semibold text-[#e6edf3]">Create New Sprint</h2>
                  <p className="text-sm text-[#9aa4b2] mt-1">
                    Add a new sprint to your project.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="cursor-pointer">
                  Close
                </Button>
              </div>

              <div className="grid gap-4 py-5">
                <div className="grid gap-2 rounded-lg border border-[#2b3542] bg-[#11161f] p-3">
                  <Label htmlFor="sprint-select">Sprint (optional)</Label>
                  <select
                    id="sprint-select"
                    data-testid="select-existing-sprint"
                    value={selectedSprintId}
                    onChange={(e) => {
                      const value = e.target.value
                      setSelectedSprintId(value)
                      setErrorMessage('')

                      if (!value) {
                        setSprintNumber('')
                        setGoal('')
                        setStartDate('')
                        setEndDate('')
                        return
                      }

                      const sprint = sprintOptions.find((option) => String(option.idSprint) === value)
                      if (sprint) {
                        setSprintNumber(String(sprint.sprintNumber))
                        setGoal(sprint.goal || '')
                        setStartDate(sprint.startDate || '')
                        setEndDate(sprint.endDate || '')
                      }
                    }}
                    title="Select sprint to edit"
                    className="border-input bg-input-background rounded-md border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] cursor-pointer"
                    disabled={sprintOptions.length === 0}
                  >
                    <option value="">Create new sprint</option>
                    {sprintOptions.map((sprint) => (
                      <option key={sprint.idSprint} value={String(sprint.idSprint)}>
                        {formatSprintLabel(sprint)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2 rounded-lg border border-[#2b3542] bg-[#11161f] p-3">
                  <Label htmlFor="sprint-number">Sprint Number *</Label>
                  <Input
                    id="sprint-number"
                    data-testid="input-sprint-number"
                    value={sprintNumber}
                    onChange={(e) => setSprintNumber(e.target.value)}
                    placeholder="1"
                    inputMode="numeric"
                    required
                  />
                </div>

                <div className="grid gap-2 rounded-lg border border-[#2b3542] bg-[#11161f] p-3">
                  <Label htmlFor="sprint-goal">Goal</Label>
                  <Textarea
                    id="sprint-goal"
                    data-testid="input-sprint-goal"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="Sprint goal"
                    rows={3}
                  />
                </div>

                <div className="grid gap-2 rounded-lg border border-[#2b3542] bg-[#11161f] p-3">
                  <Label htmlFor="sprint-start">Start Date</Label>
                  <DatePickerInput
                    id="sprint-start"
                    testId="input-sprint-start-date"
                    value={startDate}
                    onChange={(value) => {
                      setStartDate(value)
                      setErrorMessage('')
                    }}
                  />
                </div>

                <div className="grid gap-2 rounded-lg border border-[#2b3542] bg-[#11161f] p-3">
                  <Label htmlFor="sprint-end">End Date</Label>
                  <DatePickerInput
                    id="sprint-end"
                    testId="input-sprint-end-date"
                    value={endDate}
                    onChange={(value) => {
                      setEndDate(value)
                      setErrorMessage('')
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-[#2b3542]">
                {errorMessage && (
                  <p className="mr-auto self-center text-sm text-red-400" data-testid="text-sprint-error">{errorMessage}</p>
                )}
                {isEditMode && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    className="cursor-pointer"
                    disabled={!projectId || submitting}
                  >
                    Delete Sprint
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="cursor-pointer">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="cursor-pointer"
                  data-testid="btn-submit-sprint"
                  disabled={!projectId || submitting}
                >
                  {submitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Sprint'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
