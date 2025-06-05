import { gql } from 'graphql-request';

// Auth mutations
export const SIGN_UP = gql`
  mutation SignUp($input: SignUpInput!) {
    signUp(input: $input) {
      user {
        id
        email
        name
        role
      }
      token
    }
  }
`;

export const SIGN_IN = gql`
  mutation SignIn($input: SignInInput!) {
    signIn(input: $input) {
      user {
        id
        email
        name
        role
        avatarUrl
      }
      token
    }
  }
`;

// Project mutations
export const CREATE_PROJECT = gql`
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      id
      name
      description
      thumbnail
      status
      createdAt
    }
  }
`;

export const UPDATE_PROJECT = gql`
  mutation UpdateProject($id: ID!, $input: UpdateProjectInput!) {
    updateProject(id: $id, input: $input) {
      id
      name
      description
      thumbnail
      status
      settings
      updatedAt
    }
  }
`;

export const DELETE_PROJECT = gql`
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id)
  }
`;

// Page mutations
export const CREATE_PAGE = gql`
  mutation CreatePage($input: CreatePageInput!) {
    createPage(input: $input) {
      id
      name
      path
      isHome
      content
      projectId
      createdAt
    }
  }
`;

export const UPDATE_PAGE = gql`
  mutation UpdatePage($id: ID!, $input: UpdatePageInput!) {
    updatePage(id: $id, input: $input) {
      id
      name
      path
      isHome
      content
      updatedAt
    }
  }
`;

export const DELETE_PAGE = gql`
  mutation DeletePage($id: ID!) {
    deletePage(id: $id)
  }
`;

// Component mutations
export const CREATE_COMPONENT = gql`
  mutation CreateComponent($input: CreateComponentInput!) {
    createComponent(input: $input) {
      id
      name
      type
      props
      styles
      children
      projectId
      createdAt
    }
  }
`;

export const UPDATE_COMPONENT = gql`
  mutation UpdateComponent($id: ID!, $input: UpdateComponentInput!) {
    updateComponent(id: $id, input: $input) {
      id
      name
      type
      props
      styles
      children
      updatedAt
    }
  }
`;

export const DELETE_COMPONENT = gql`
  mutation DeleteComponent($id: ID!) {
    deleteComponent(id: $id)
  }
`;

// Asset mutations
export const UPLOAD_ASSET = gql`
  mutation UploadAsset($input: UploadAssetInput!) {
    uploadAsset(input: $input) {
      id
      name
      type
      url
      size
      metadata
      createdAt
    }
  }
`;

export const DELETE_ASSET = gql`
  mutation DeleteAsset($id: ID!) {
    deleteAsset(id: $id)
  }
`;

// Deployment mutations
export const CREATE_DEPLOYMENT = gql`
  mutation CreateDeployment($input: CreateDeploymentInput!) {
    createDeployment(input: $input) {
      id
      status
      url
      provider
      metadata
      createdAt
    }
  }
`;

export const UPDATE_DEPLOYMENT_STATUS = gql`
  mutation UpdateDeploymentStatus($id: ID!, $status: String!) {
    updateDeploymentStatus(id: $id, status: $status) {
      id
      status
      completedAt
    }
  }
`;

// Activity mutations
export const CREATE_ACTIVITY = gql`
  mutation CreateActivity($input: CreateActivityInput!) {
    createActivity(input: $input) {
      id
      type
      description
      metadata
      createdAt
    }
  }
`;