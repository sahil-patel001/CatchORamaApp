
import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

interface EditSalesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  salesData: any
  onSave: (updatedData: any) => void
}

export function EditSalesModal({ open, onOpenChange, salesData, onSave }: EditSalesModalProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    month: '',
    amount: 0
  })

  useEffect(() => {
    if (salesData) {
      setFormData({
        month: salesData.month,
        amount: salesData.amount
      })
    }
  }, [salesData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.amount <= 0) {
      toast({
        title: "Error",
        description: "Amount must be greater than 0",
        variant: "destructive"
      })
      return
    }

    onSave({ ...salesData, ...formData })
    toast({
      title: "Success",
      description: "Sales data updated successfully"
    })
    onOpenChange(false)
  }

  if (!salesData) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Sales Data</DialogTitle>
          <DialogDescription>
            Update sales information for {salesData.month}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="month">Month</Label>
            <Input
              id="month"
              value={formData.month}
              onChange={(e) => setFormData(prev => ({ ...prev, month: e.target.value }))}
              placeholder="Enter month"
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
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
