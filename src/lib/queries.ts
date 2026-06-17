import { gql } from "graphql-request";

export const LOGIN_QUERY = gql`
  query Login($email: String!) {
    users(where: { email: { _eq: $email }, archived: { _eq: false } }, limit: 1) {
      id
      name
      email
      password_hash
      role
      avatar_url
    }
  }
`;

export const DASHBOARD_QUERY = gql`
  query Dashboard {
    contacts_aggregate(where: { archived: { _eq: false } }) {
      aggregate {
        count
      }
    }
    deals_aggregate(where: { archived: { _eq: false } }) {
      aggregate {
        count
        sum {
          total_value
        }
      }
    }
    receivables_aggregate {
      aggregate {
        count
      }
    }
    paid: receivables_aggregate(where: { status: { _eq: "paid" } }) {
      aggregate {
        count
        sum {
          received_value
        }
      }
    }
    pending: receivables_aggregate(where: { status: { _eq: "pending" } }) {
      aggregate {
        count
        sum {
          value
        }
      }
    }
  }
`;

export const CONTACTS_QUERY = gql`
  query Contacts {
    contacts(where: { archived: { _eq: false } }, order_by: { created_at: desc }) {
      id
      full_name
      email
      phone
      job_title
      stage
      origin
      created_at
    }
  }
`;

export const DEALS_QUERY = gql`
  query Deals {
    deals(where: { archived: { _eq: false } }, order_by: { created_at: desc }) {
      id
      title
      total_value
      forecast_date
      created_at
      pipeline_id
      stage_id
    }
    pipelines {
      id
      name
    }
    pipeline_stages {
      id
      name
      type
      pipeline_id
    }
  }
`;

export const USER_QUERY = gql`
  query User($id: uuid!) {
    users_by_pk(id: $id) {
      id
      name
      email
      role
      avatar_url
      password_hash
      created_at
      updated_at
    }
  }
`;

export const UPDATE_USER_PROFILE = gql`
  mutation UpdateUserProfile($id: uuid!, $set: users_set_input!) {
    update_users_by_pk(pk_columns: { id: $id }, _set: $set) {
      id
      name
      email
      avatar_url
    }
  }
`;

export const UPDATE_USER_PASSWORD = gql`
  mutation UpdateUserPassword($id: uuid!, $hash: String!) {
    update_users_by_pk(
      pk_columns: { id: $id }
      _set: { password_hash: $hash }
    ) {
      id
    }
  }
`;

export const USERS_ADMIN_LIST = gql`
  query UsersAdminList {
    users(where: { archived: { _eq: false } }, order_by: { created_at: asc }) {
      id
      name
      email
      role
      avatar_url
      created_at
      updated_at
    }
  }
`;

export const CREATE_USER = gql`
  mutation CreateUser($obj: users_insert_input!) {
    insert_users_one(object: $obj) {
      id
    }
  }
`;

export const UPDATE_USER_ADMIN = gql`
  mutation UpdateUserAdmin($id: uuid!, $set: users_set_input!) {
    update_users_by_pk(pk_columns: { id: $id }, _set: $set) {
      id
    }
  }
`;

export const ARCHIVE_USER = gql`
  mutation ArchiveUser($id: uuid!) {
    update_users_by_pk(pk_columns: { id: $id }, _set: { archived: true }) {
      id
    }
  }
`;

export const CREATE_CONTACT = gql`
  mutation CreateContact($obj: contacts_insert_input!) {
    insert_contacts_one(object: $obj) {
      id
    }
  }
`;

export const UPDATE_CONTACT = gql`
  mutation UpdateContact($id: uuid!, $set: contacts_set_input!) {
    update_contacts_by_pk(pk_columns: { id: $id }, _set: $set) {
      id
    }
  }
`;

export const DELETE_CONTACT = gql`
  mutation DeleteContact($id: uuid!) {
    update_contacts_by_pk(pk_columns: { id: $id }, _set: { archived: true }) {
      id
    }
  }
`;
