// @generated automatically by Diesel CLI.

diesel::table! {
    branches (id) {
        id -> Integer,
        branch_name -> Text,
        display_name -> Text,
        branch_version -> Text,
    }
}
