import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/components/DataTable";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AddCategoryModal } from "@/components/modals/AddCategoryModal";
import { EditCategoryModal } from "@/components/modals/EditCategoryModal";
import { useToast } from "@/hooks/use-toast";
import * as categoryService from "@/services/categoryService";
import { Category } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

type CategoryRow = Category & { id: string };

export function CategoryManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );

  const {
    data: categories,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: categoryService.getCategories,
  });

  const createMutation = useMutation({
    mutationFn: categoryService.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({
        title: "Success",
        description: "Category created successfully.",
      });
      setAddModalOpen(false);
    },
    onError: (error: {
      response?: { data?: { error?: { message?: string } } };
    }) => {
      toast({
        title: "Error",
        description:
          error?.response?.data?.error?.message || "Could not create category.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<Category, "_id">>;
    }) => categoryService.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({
        title: "Success",
        description: "Category updated successfully.",
      });
      setEditModalOpen(false);
    },
    onError: (error: {
      response?: { data?: { error?: { message?: string } } };
    }) => {
      toast({
        title: "Error",
        description:
          error?.response?.data?.error?.message || "Could not update category.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: categoryService.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({
        title: "Success",
        description: "Category deleted successfully.",
      });
      setDeleteDialogOpen(false);
    },
    onError: (error: {
      response?: { data?: { error?: { message?: string } } };
    }) => {
      toast({
        title: "Error",
        description:
          error?.response?.data?.error?.message || "Could not delete category.",
        variant: "destructive",
      });
    },
  });

  const columns = [
    {
      key: "name" as const,
      header: "Category Name",
      sortable: true, // Essential for finding categories quickly
      render: (value: any) => (
        <span className="font-medium">{String(value)}</span>
      ),
    },
    {
      key: "description" as const,
      header: "Description",
      sortable: false, // Descriptive text, less useful to sort
    },
    {
      key: "createdAt" as const,
      header: "Created",
      sortable: false, // Less frequently needed for business operations
      render: (value: any) => formatDate(String(value)),
    },
  ];

  const handleAdd = () => setAddModalOpen(true);
  const handleAddCategory = (category: Omit<Category, "_id">) => {
    createMutation.mutate(category);
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setEditModalOpen(true);
  };

  const handleEditCategory = (
    updatedCategory: Partial<Omit<Category, "_id">>
  ) => {
    if (selectedCategory?._id) {
      updateMutation.mutate({
        id: selectedCategory._id,
        data: updatedCategory,
      });
    }
  };

  const handleDelete = (category: Category) => {
    setSelectedCategory(category);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedCategory?._id) {
      deleteMutation.mutate(selectedCategory._id);
    }
  };

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Category Management
          </h1>
          <p className="text-muted-foreground">
            Organize your products into categories
          </p>
        </div>
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <h3 className="text-red-800 font-medium">
            Error fetching categories
          </h3>
          <p className="text-red-600 text-sm mt-1">
            {(
              error as {
                response?: { data?: { error?: { message?: string } } };
              }
            )?.response?.data?.error?.message || "An unknown error occurred"}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Category Management
          </h1>
          <p className="text-muted-foreground">
            Organize your products into categories
          </p>
        </div>
        <Skeleton className="h-96 w-full" data-testid="skeleton" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Category Management
        </h1>
        <p className="text-muted-foreground">
          Organize your products into categories
        </p>
      </div>

      <DataTable
        data={
          Array.isArray(categories)
            ? categories.map((c) => ({ ...c, id: c._id }))
            : []
        }
        columns={columns}
        searchKey="name"
        searchPlaceholder="Search categories..."
        onAdd={handleAdd}
        onEdit={(item) => handleEdit(item as unknown as Category)}
        onDelete={(item) => handleDelete(item as unknown as Category)}
        addButtonText="Add Category"
      />

      <AddCategoryModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onAdd={handleAddCategory}
      />

      {selectedCategory && (
        <EditCategoryModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          category={selectedCategory}
          onEdit={handleEditCategory}
        />
      )}

      {selectedCategory && (
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={confirmDelete}
          title="Are you sure?"
          description={`This will permanently delete the "${selectedCategory.name}" category.`}
        />
      )}
    </div>
  );
}
