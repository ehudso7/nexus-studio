import { gql } from 'graphql-request';

// User queries
export const GET_ME = gql`
  query GetMe {
    me {
      id
      email
      name
      avatarUrl
      role
      createdAt
      updatedAt
    }
  }
`;

// Project queries
export const GET_PROJECTS = gql`
  query GetProjects {
    projects {
      id
      name
      description
      thumbnail
      status
      createdAt
      updatedAt
      _count {
        pages
        components
      }
    }
  }
`;

export const GET_PROJECT = gql`
  query GetProject($id: ID!) {
    project(id: $id) {
      id
      name
      description
      thumbnail
      status
      settings
      createdAt
      updatedAt
      pages {
        id
        name
        path
        isHome
        content
        createdAt
        updatedAt
      }
      components {
        id
        name
        type
        props
        styles
        children
        createdAt
        updatedAt
      }
      deployments {
        id
        status
        url
        provider
        metadata
        createdAt
      }
    }
  }
`;

// Page queries
export const GET_PAGE = gql`
  query GetPage($id: ID!) {
    page(id: $id) {
      id
      name
      path
      isHome
      content
      projectId
      createdAt
      updatedAt
      project {
        id
        name
      }
    }
  }
`;

// Component queries
export const GET_COMPONENTS = gql`
  query GetComponents($projectId: ID!) {
    components(projectId: $projectId) {
      id
      name
      type
      props
      styles
      children
      createdAt
      updatedAt
    }
  }
`;

// Asset queries
export const GET_ASSETS = gql`
  query GetAssets($projectId: ID!) {
    assets(projectId: $projectId) {
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

// Deployment queries
export const GET_DEPLOYMENTS = gql`
  query GetDeployments($projectId: ID!) {
    deployments(projectId: $projectId) {
      id
      status
      url
      provider
      metadata
      createdAt
      completedAt
      project {
        id
        name
      }
    }
  }
`;

// Activity queries
export const GET_ACTIVITIES = gql`
  query GetActivities($projectId: ID, $limit: Int) {
    activities(projectId: $projectId, limit: $limit) {
      id
      type
      description
      metadata
      createdAt
      user {
        id
        name
        email
        avatarUrl
      }
      project {
        id
        name
      }
    }
  }
`;