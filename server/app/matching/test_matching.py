from matching_algorithm import rank_mentors



students = [

{
    "id":1,
    "name":"Aisha",
    "gender":"female",
    "major":"Computer Science",
    "desired_career":"Machine Learning",
    "tags":[
        "Python",
        "Machine Learning",
        "Healthcare"
    ]
},


{
    "id":2,
    "name":"Omar",
    "gender":"male",
    "major":"Business",
    "desired_career":"Finance",
    "tags":[
        "SQL",
        "Analytics",
        "Marketing"
    ]
},


{
    "id":3,
    "name":"Sara",
    "gender":"female",
    "major":"Data Science",
    "desired_career":"Data Science",
    "tags":[
        "Python",
        "Data Science",
        "AI"
    ]
}

]





mentors = [

{
"id":101,
"name":"Farhan",
"gender":"male",
"major":"Computer Science",
"industry":"Healthcare AI",
"tags":[
"Python",
"Machine Learning",
"Deep Learning"
]
},


{
"id":102,
"name":"Ahmed",
"gender":"male",
"major":"Business",
"industry":"Finance",
"tags":[
"SQL",
"Marketing",
"Analytics"
]
},


{
"id":103,
"name":"Fatima",
"gender":"female",
"major":"Computer Science",
"industry":"Software Engineering",
"tags":[
"Python",
"Data Science"
]
},


{
"id":104,
"name":"Yusuf",
"gender":"male",
"major":"Data Science",
"industry":"AI Research",
"tags":[
"Python",
"Machine Learning",
"AI"
]
},


{
"id":105,
"name":"Maryam",
"gender":"female",
"major":"Computer Science",
"industry":"Healthcare Technology",
"tags":[
"Python",
"Healthcare",
"Data Science"
]
},


{
"id":106,
"name":"Bilal",
"gender":"male",
"major":"Business",
"industry":"Investment Banking",
"tags":[
"SQL",
"Finance",
"Analytics"
]
},


{
"id":107,
"name":"Hassan",
"gender":"male",
"major":"Computer Engineering",
"industry":"Machine Learning",
"tags":[
"Deep Learning",
"Python",
"AI"
]
}

]





for student in students:

    print("\n==============================")
    print(
        f"Recommendations for {student['name']}"
    )
    print("==============================")


    matches = rank_mentors(
        student,
        mentors
    )


    for rank, match in enumerate(matches, start=1):

        print(
            f"{rank}. "
            f"{match['name']} "
            f"- Score: {match['score']}"
        )