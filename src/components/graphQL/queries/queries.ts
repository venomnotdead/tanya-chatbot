import { gql } from "@apollo/client";

export const GET_CATEGORIES = gql`
  query GetCategories {
    categories(limit: 4) {
      total
      results {
        id
        key
        name(locale: "en-US")
      }
    }
  }
`;

export const PRODUCTS_BY_CATEGORY = gql`
  query ProductsByCategory(
    $filters: [SearchFilterInput!]!
    $limit: Int
    $offset: Int
  ) {
    productProjectionSearch(filters: $filters, limit: $limit, offset: $offset) {
      offset
      total
      count
      results {
        id
        key
        name(locale: "en-US")
        description(locale: "en-US")
        masterVariant {
          prices {
            value {
              currencyCode
              centAmount
            }
          }
          images {
            url
          }
        }
      }
    }
  }
`;

export const GET_ALL_CART_ADDRESS = gql`
  query CartAddress($id: String!) {
    cart(id: $id) {
      itemShippingAddresses {
        id
        firstName
        lastName
        streetName
        city
        postalCode
        state
        phone
        email
      }
    }
  }
`;

export const GET_ALL_ORDERS = gql`
  query GetOrders($where: String, $sort: [String!], $limit: Int, $offset: Int) {
    orders(where: $where, sort: $sort, limit: $limit, offset: $offset) {
      offset
      count
      total
      exists
      results {
        id
        customerId
        customer {
          id
          email
        }
        lineItems {
          id
          productId
          nameAllLocales {
            locale
            value
          }
          variant {
            images {
              url
            }
          }
          quantity
          price {
            value {
              centAmount
              currencyCode
            }
          }
        }
        shippingAddress {
          firstName
          lastName
          streetName
          postalCode
          city
          country
        }
      }
    }
  }
`;
