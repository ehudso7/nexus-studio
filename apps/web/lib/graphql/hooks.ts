import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { graphQLClient } from '../graphql-client';
import * as queries from './queries';
import * as mutations from './mutations';

// Query hooks
export function useMe(options?: UseQueryOptions) {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const data = await graphQLClient.request(queries.GET_ME);
      return data.me;
    },
    ...options,
  });
}

export function useProjects(options?: UseQueryOptions) {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const data = await graphQLClient.request(queries.GET_PROJECTS);
      return data.projects;
    },
    ...options,
  });
}

export function useProject(id: string, options?: UseQueryOptions) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const data = await graphQLClient.request(queries.GET_PROJECT, { id });
      return data.project;
    },
    enabled: !!id,
    ...options,
  });
}

export function usePage(id: string, options?: UseQueryOptions) {
  return useQuery({
    queryKey: ['page', id],
    queryFn: async () => {
      const data = await graphQLClient.request(queries.GET_PAGE, { id });
      return data.page;
    },
    enabled: !!id,
    ...options,
  });
}

export function useComponents(projectId: string, options?: UseQueryOptions) {
  return useQuery({
    queryKey: ['components', projectId],
    queryFn: async () => {
      const data = await graphQLClient.request(queries.GET_COMPONENTS, { projectId });
      return data.components;
    },
    enabled: !!projectId,
    ...options,
  });
}

export function useAssets(projectId: string, options?: UseQueryOptions) {
  return useQuery({
    queryKey: ['assets', projectId],
    queryFn: async () => {
      const data = await graphQLClient.request(queries.GET_ASSETS, { projectId });
      return data.assets;
    },
    enabled: !!projectId,
    ...options,
  });
}

export function useDeployments(projectId: string, options?: UseQueryOptions) {
  return useQuery({
    queryKey: ['deployments', projectId],
    queryFn: async () => {
      const data = await graphQLClient.request(queries.GET_DEPLOYMENTS, { projectId });
      return data.deployments;
    },
    enabled: !!projectId,
    ...options,
  });
}

export function useActivities(projectId?: string, limit?: number, options?: UseQueryOptions) {
  return useQuery({
    queryKey: ['activities', projectId, limit],
    queryFn: async () => {
      const data = await graphQLClient.request(queries.GET_ACTIVITIES, { projectId, limit });
      return data.activities;
    },
    ...options,
  });
}

// Mutation hooks
export function useSignUp(options?: UseMutationOptions) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: any) => {
      const data = await graphQLClient.request(mutations.SIGN_UP, { input });
      return data.signUp;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    ...options,
  });
}

export function useSignIn(options?: UseMutationOptions) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: any) => {
      const data = await graphQLClient.request(mutations.SIGN_IN, { input });
      return data.signIn;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    ...options,
  });
}

export function useCreateProject(options?: UseMutationOptions) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: any) => {
      const data = await graphQLClient.request(mutations.CREATE_PROJECT, { input });
      return data.createProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    ...options,
  });
}

export function useUpdateProject(options?: UseMutationOptions) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: any }) => {
      const data = await graphQLClient.request(mutations.UPDATE_PROJECT, { id, input });
      return data.updateProject;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project', data.id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    ...options,
  });
}

export function useDeleteProject(options?: UseMutationOptions) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const data = await graphQLClient.request(mutations.DELETE_PROJECT, { id });
      return data.deleteProject;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    ...options,
  });
}

export function useCreatePage(options?: UseMutationOptions) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: any) => {
      const data = await graphQLClient.request(mutations.CREATE_PAGE, { input });
      return data.createPage;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project', data.projectId] });
    },
    ...options,
  });
}

export function useUpdatePage(options?: UseMutationOptions) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: any }) => {
      const data = await graphQLClient.request(mutations.UPDATE_PAGE, { id, input });
      return data.updatePage;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['page', data.id] });
      queryClient.invalidateQueries({ queryKey: ['project', data.projectId] });
    },
    ...options,
  });
}

export function useDeletePage(options?: UseMutationOptions) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const data = await graphQLClient.request(mutations.DELETE_PAGE, { id });
      return data.deletePage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project'] });
    },
    ...options,
  });
}

export function useCreateComponent(options?: UseMutationOptions) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: any) => {
      const data = await graphQLClient.request(mutations.CREATE_COMPONENT, { input });
      return data.createComponent;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['components', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', data.projectId] });
    },
    ...options,
  });
}

export function useUpdateComponent(options?: UseMutationOptions) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: any }) => {
      const data = await graphQLClient.request(mutations.UPDATE_COMPONENT, { id, input });
      return data.updateComponent;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['components', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', data.projectId] });
    },
    ...options,
  });
}

export function useDeleteComponent(options?: UseMutationOptions) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const data = await graphQLClient.request(mutations.DELETE_COMPONENT, { id });
      return data.deleteComponent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['components'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
    },
    ...options,
  });
}

export function useUploadAsset(options?: UseMutationOptions) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: any) => {
      const data = await graphQLClient.request(mutations.UPLOAD_ASSET, { input });
      return data.uploadAsset;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assets', data.projectId] });
    },
    ...options,
  });
}

export function useDeleteAsset(options?: UseMutationOptions) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const data = await graphQLClient.request(mutations.DELETE_ASSET, { id });
      return data.deleteAsset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
    ...options,
  });
}

export function useCreateDeployment(options?: UseMutationOptions) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: any) => {
      const data = await graphQLClient.request(mutations.CREATE_DEPLOYMENT, { input });
      return data.createDeployment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['deployments', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', data.projectId] });
    },
    ...options,
  });
}

export function useUpdateDeploymentStatus(options?: UseMutationOptions) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const data = await graphQLClient.request(mutations.UPDATE_DEPLOYMENT_STATUS, { id, status });
      return data.updateDeploymentStatus;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
    },
    ...options,
  });
}

export function useCreateActivity(options?: UseMutationOptions) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: any) => {
      const data = await graphQLClient.request(mutations.CREATE_ACTIVITY, { input });
      return data.createActivity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
    ...options,
  });
}