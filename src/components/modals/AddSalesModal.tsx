
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

interface AddSalesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (newData: any) => void
}

export function AddSalesModal({ open, onOpenChange, onAdd }: AddSalesModalProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    month: '',
    amount: 0
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.month.trim()) {
      toast({
        title: "Error",
        description: "Month is required",
        variant: "destructive"
      })
      return
    }

    if (formData.amount <= 0) {
      toast({
        title: "Error",
        description: "Amount must be greater than 0",
        variant: "destructive"
      })
      return
    }

    onAdd(formData)
    toast({
      title: "Success",
      description: "Sales data added successfully"
    })
    setFormData({ month: '', amount: 0 })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Sales Data</DialogTitle>
          <DialogDescription>
            Add new sales information
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="month">Month</Label>
            <Input
              id="month"
              value={formData.month}
              onChange={(e) => setFormData(prev => ({ ...prev, month: e.target.value }))}
              placeholder="Enter month (e.g., July)"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="amount">Revenue Amount</Label>
            <Input
              id="amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
              placeholder="Enter revenue amount"
              required
              min="1"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Sales Data</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
