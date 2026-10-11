# Indoor building data (labeled for indoors)
# environment label: indoors

environment = "indoors"

building = {
    1: {
        "name": "Business Entrance",
        "photo": "photo1.jpg",
        "directions": "Turn left around the corner.",
        "available_directions": ["left"],
        "correct_direction": "left",
        "next_location": 2,
        "poi": []
    },

    2: {
        "name": "Around the Corner",
        "photo": "photo2.jpg",
        "directions": "Turn right to enter the hallway.",
        "available_directions": ["right"],
        "correct_direction": "right",
        "next_location": 3,
        "poi": []
    },

    3: {
        "name": "Long Hallway",
        "photo": "photo3.jpg",
        "directions": "Continue straight down the hallway.",
        "available_directions": ["straight"],
        "correct_direction": "straight",
        "next_location": 4,
        "poi": ["Snack and drink vending machine"]
    },

    4: {
        "name": "Hallway Midpoint",
        "photo": "photo4.jpg",
        "directions": "Keep walking straight.",
        "available_directions": ["straight"],
        "correct_direction": "straight",
        "next_location": 5,
        "poi": []
    },

    5: {
        "name": "Hallway Intersection",
        "photo": "photo5.jpg",
        "directions": "At the intersection, turn right.",
        "available_directions": ["left", "straight", "right"],
        "correct_direction": "right",
        "next_location": 6,
        "poi": ["Drink vending machine"]
    },

    6: {
        "name": "Engineering Main Entrance",
        "photo": "photo6.jpg",
        "directions": (
            "Continue straight past the Engineering "
            "main entrance on your right."
        ),
        "available_directions": ["straight"],
        "correct_direction": "straight",
        "next_location": 7,
        "poi": ["Engineering main entrance"]
    },

    7: {
        "name": "Hallway and Staircase",
        "photo": "photo7.jpg",
        "directions": (
            "Continue straight past the hallway "
            "and staircase on your right."
        ),
        "available_directions": ["straight"],
        "correct_direction": "straight",
        "next_location": 8,
        "poi": ["Snack and Drink vending machine"]
    },

    8: {
        "name": "Academic Affairs Office",
        "photo": "photo8.jpg",
        "directions": "Turn left into the hallway.",
        "available_directions": ["left"],
        "correct_direction": "left",
        "next_location": 9,
        "poi": ["Academic Affairs office"]
    },

    9: {
        "name": "Final Hallway",
        "photo": "photo9.jpg",
        "directions": "Continue straight down the hallway.",
        "available_directions": ["straight"],
        "correct_direction": "straight",
        "next_location": 10,
        "poi": []
    },

    10: {
        "name": "Final Hallway Midpoint",
        "photo": "photo10.jpg",
        "directions": "Keep walking straight.",
        "available_directions": ["straight"],
        "correct_direction": "straight",
        "next_location": 11,
        "poi": []
    },

    11: {
        "name": "Approaching Classroom 118",
        "photo": "photo11.jpg",
        "directions": "Continue straight to Classroom 118.",
        "available_directions": ["straight"],
        "correct_direction": "straight",
        "next_location": 12,
        "poi": []
    },

    12: {
        "name": "Classroom 118",
        "photo": "photo12.jpg",
        "directions": "You have arrived at Classroom 118!",
        "available_directions": [],
        "correct_direction": None,
        "next_location": 13,
        "poi": ["Classroom 118"]
    },

    13: {
        "name": "Classroom 118 - Room Number",
        "photo": "photo13.jpg",
        "directions": "Confirm your destination using the room number.",
        "available_directions": [],
        "correct_direction": None,
        "next_location": None,
        "poi": ["Room number 118"]
    }
}
