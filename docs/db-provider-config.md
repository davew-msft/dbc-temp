
# How to config DB Provider when connect to your own database

When setup a db provider endpoint with your own database, `db_id` and `conn_string` are required in the config file.
Besides, you can config the following settings to customize your db provider:

## Fields

- `grounding_config`
    
    Settings for grounding under offline and online stage, it is required to be a json object with following keys:

    - `max_tables`(**int**, defaults to `10`): max number of returned tables when call grounding API in online stage.
    
    - `max_columns`(**int**, defaults to `10`): max number of returned columns under each table when call grounding API in online stage.
    
    - `max_rows`(**int**, defaults to `3`): max number of returned rows under each table when call grounding API in online stage.
  
    - `max_sampling_rows`(**int**, defaults to `200`): max number of sampled rows used for index building in offline endpoint deployment stage (note that only indexed rows will be retrieved in on-line stage). The default value is quite small. If you find the expected rows is not retrieved but highly relevant with the question, please try a large value to ensure the expected value is indexed during offline stage.
    
    - `max_knowledge_pieces`(**int**, defaults to `10`): max number of returned knowledge pieces when call grounding API in online stage.
 
    - `max_text_length`(**int**, defaults to `200`): text length threshold used for indexing. The value of a column will not be indexed when its length is larger than `max_text_length`. 
    
    - `encode_dependency` (**bool**, defaults to `False`): a boolean value to indicate if encode the parent entities in its embedding text. For column, we will have `{table_name} {column_name}` as embedding text. We suggest enabling it if there are a lot of same column names in different tables under your database.
  
    - `ngram_hybrid_weight`(**float**, defaults to `None`): a positive float value to indicate the weight of ngram matching to calculate the final similarity between database entities and user's question. Defaults to `None` means the ngram feature is disabled.
    
    - `split_query_into_short`(**int**, defaults to `None`): this is designed for long-query. A positive value `K` means that we will split the original long query into several short queries and each short query has `K` tokens. `None` indicates we will keep the original query and search once.

    **NOTE**: `encode_dependency`, `ngram_hybrid_weight` and `split_query_into_short` are used to optimize the recall in grounding stage. The performance depends on the query style and dataset entity distribution. So we suggest you conduct experiments to select the best hyperparameter on your own data. And all these optimization will increase the search latency, especially for config `split_query_into_short`.


- `selected_tables`
  
  One database may have multiple tables. You can config this field to select the set of tables you want to enable for grounding and prompt building. `selected_tables` requires a list of table full names. Please note that in **SQLServer**, the full table name **must follow** format `[{schema_name}].[{table_name}]`, such as `[dbo].[DatabaseLog]`.

- `column_settings`
  
  `column_settings` is used to config the description or security information for columns. It is a dictionary object with `column full name` (table_name + '.' + column_name) as the key. The value is also a dictionary object with following two fields:
  
  - `security_level`: an integer enum value (i.e., `1`, `2`, or `3`). Defaults to `3`. For `1` and `2`, the values of the column will not be used for indexing and prompt construction. `security_level` is used to enable users avoid sending personal or sensitive data under the column (e.g., *UserId*, *PassWord*) to embedding model and LLM. `1` is designed for SQL-level protection, but not implemented yet.
  
  - `description`: the description or any other column related information. You can use this field to hack the column knowledge. By default, the `description` will be used for prompt building.

- `knowledge_pieces`

  This field provides the interface to let users upload their domain specific knowledge. `knowledge_pieces` is a list. Each element is a `knowledge_piece`. In online stage, we will use embedding service to retrieve `max_knowledge_pieces` (refers to `grounding_config`) of knowledge and pack them into prompt. Here is the definition for each `KnowledgePiece` with the following properties: 
  -  `text` (**str**, required): text representation of the knowledge. Be used to calculate embedding and packed into prompt.
  -  `entities` (**List[str]**, optional): relevant table or columns (full names). If provided, when the knowledge piece is retrieved, we need to return the corresponding entities in schema too.


## Sample
Here is an sample config json file for SQLSever Sample Database [AdventureWorks2019](https://learn.microsoft.com/en-us/sql/samples/adventureworks-install-configure?view=sql-server-ver16&tabs=ssms):

```json
[
    {
        "db_id": "AdventureWorks2019",
        "conn_string": "sqlserver://<your_odbc_conn_string>",
        "grounding_config": {
            "max_tables": 10,
            "max_columns": 10,
            "max_rows": 3,
            "max_sampling_rows": 10000,
            "max_text_length": 100,
            "ngram_hybrid_weight": 0.5
        },
        "selected_tables": [
            "[HumanResources].[Department]",
            "[Person].[Address]",
            "[Person].[BusinessEntity]"
        ],
        "column_settings": {
            "[HumanResources].[Department].DepartmentID" : {
                "description": "unique id of department"
            },
            "[HumanResources].[Department].BusinessEntityID" : {
                "description": "unique id of an employee",
                "security_level": 1
            },
        },
        "knowledge_pieces": [
            {
                "text": "when fetch address, just return city."
            },
            {
                "text": "New Department is defined by the ModifiedDate. New department = true if ModifiedDate is in recent 6 month.",
                "entities": ["[HumanResources].[Department].ModifiedDate"]
            }
        ]
    }
]
```