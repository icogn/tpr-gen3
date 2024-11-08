use diesel::prelude::*;

use crate::global;

pub fn establish_connection() -> Result<SqliteConnection, ConnectionError> {
    let db_url = global::vars().db_url;

    SqliteConnection::establish(&db_url)
    // .unwrap_or_else(|_| panic!("Error connecting to {}", db_url))
}
