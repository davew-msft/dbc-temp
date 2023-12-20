from db_copilot.contract.api_core import APIManager

EXAMPLES = [
    [
        {
            "question": "top 3 customers by total sales",
            "response": f"""
<Response>
<Cell>
To find the top 3 customers by total sales, we can calculate the total sales for each customer by summing the product of the quantity and list price for each order item, and then group by the customer_id. Here's the T-SQL query to achieve this:
</Cell>
<Cell>
```tsql code_id='1'
WITH [customer_sales] AS (
    SELECT
        o.[customer_id],
        SUM(oi.[quantity] * oi.[list_price] * (1 - oi.[discount])) AS [total_sales]
    FROM [sales].[orders] o
    JOIN [sales].[order_items] oi ON o.[order_id] = oi.[order_id]
    GROUP BY o.[customer_id]
)
SELECT TOP 3
    cs.[customer_id],
    c.[first_name],
    c.[last_name],
    cs.[total_sales]
FROM [customer_sales] cs
JOIN [sales].[customers] c ON cs.[customer_id] = c.[customer_id]
ORDER BY cs.[total_sales] DESC;
```
</Cell>
<Cell>
Now, let's create a bar chart to visualize the sales distribution among these top 3 customers.
</Cell>
<Cell>
```python code_id='2'
res = px.bar({APIManager.GET_CODE_RESULT.template.format(code_id='1')}, x='first_name', y='total_sales', title='Top 3 Customers by Total Sales').to_json()
```
</Cell>
<Cell>
The End
</Cell>
</Response>
"""
        },
        {
            "question": "as pie chart",
            "response": f"""
<Response>
<Cell>
Now that we have the top 3 customers by total sales, let's create a pie chart.
</Cell>
<Cell>
```python code_id='3'
res = px.pie({APIManager.GET_CODE_RESULT.template.format(code_id='1')}, values='total_sales', names='first_name', title='Top 3 Customers by Total Sales').to_json()
```
</Cell>
<Cell>
The End
</Cell>
</Response>
"""
        },
    ],
    [
        {
            "question": "who win the most number of gold medal in 2000",
            "response": f"""
<Response>
<Cell>
To find the athlete who won the most number of gold medals in the 2000 games, we can join the Games, GamesCompetitor, CompetitorEvent, Medal, and Person tables. Here's the T-SQL query to achieve this:
</Cell>
<Cell>
```tsql code_id='3'
WITH [GoldMedalists] AS (
    SELECT
        gc.[PersonId],
        COUNT(*) as [GoldMedalCount]
    FROM [dbo].[Games] g
    JOIN [dbo].[GamesCompetitor] gc ON g.[Id] = gc.[GamesId]
    JOIN [dbo].[CompetitorEvent] ce ON gc.[Id] = ce.[CompetitorId]
    WHERE g.[GamesYear] = 2000 AND ce.[MedalId] = 1
    GROUP BY gc.[PersonId]
)
SELECT TOP 1
    p.[Id] as [PersonId],
    p.[FullName],
    gm.[GoldMedalCount]
FROM [GoldMedalists] gm
JOIN [dbo].[Person] p ON gm.[PersonId] = p.[Id]
ORDER BY gm.[GoldMedalCount] DESC;
```
</Cell>
<Cell>
The athlete who won the most number of gold medals in the 2000 games is Inge de Bruijn with a total of 3 gold medals.
</Cell>
<Cell>
The End
</Cell>
</Response>
"""
        }
    ],
    [
        {
            "question": "employee distribution by department",
            "response": """
<Response>
<Cell>
To find the employee distribution by department, we can count the number of employees in each department by joining the employees and departments tables and then grouping by the department name. Here's the T-SQL query to get the employee distribution data:
</Cell>
<Cell>
```tsql code_id='5'
SELECT
    d.[department_name],
    COUNT(e.[employee_id]) as [employee_count]
FROM [dbo].[employees] e
JOIN [dbo].[departments] d ON e.[department_id] = d.[department_id]
GROUP BY d.[department_name]
ORDER BY [employee_count] DESC;
```
</Cell>
<Cell>
Now that we have the employee distribution data for each department, let's create a bar chart using Plotly. We will use the department_name as the x-axis and employee_count as the y-axis.
</Cell>
<Cell>
```python code_id='6'
res = px.bar(get_code_result(code_id='1'), x='department_name', y='employee_count', title='Employee Distribution by Department').to_json()
```
</Cell>
<Cell>
The End
</Cell>
</Response>
"""
        }
    ],
]