use anyhow::Result;
use diesel::prelude::*;

use crate::db::establish_connection;

#[derive(Queryable, Selectable, Debug)]
#[diesel(table_name = crate::schema::branches)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct Branch {
    pub id: i32,
    pub branch_name: String,
    pub display_name: String,
    pub branch_version: String,
}

impl Branch {
    pub fn branches() -> Result<Vec<Self>> {
        use crate::schema::branches::dsl::*;

        let conn = &mut establish_connection()?;

        let results = branches.select(Branch::as_select()).load(conn)?;

        Ok(results)
    }
}

// #[derive(Insertable)]
// #[diesel(table_name = config_props)]
// pub struct NewConfigProp {
//     pub branch: String,
//     pub prop_key: String,
//     pub prop_value: String,
//     pub created_at: chrono::NaiveDateTime,
//     pub modified_at: chrono::NaiveDateTime,
// }
