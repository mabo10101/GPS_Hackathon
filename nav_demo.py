
# Indoor Navigation Demo
# Route: Engineering 1 Business Entrance -> Classroom 118

from data.indoor_building import building, environment

# Optionally expose environment info (e.g., 'indoors') if needed
_ENVIRONMENT = environment


def show_location(location_id):
    location = building[location_id]

    print("\n" + "=" * 35)
    print("Location:", location["name"])
    print("Photo:", location["photo"])
    print("Directions:", location["directions"])

    if location["poi"]:
        print("Point of interest:", ", ".join(location["poi"]))

    if location["available_directions"]:
        print(
            "Available arrows:",
            ", ".join(location["available_directions"])
        )

    print("=" * 35)


def move(location_id, direction):
    location = building[location_id]

    # Check whether the user can choose this direction.
    if direction not in location["available_directions"]:
        return {
            "success": False,
            "message": "That direction is not available here."
        }

    # Check whether this direction is implemented
    # as part of our Classroom 118 route.
    if direction != location["correct_direction"]:
        return {
            "success": False,
            "message": (
                "That path is not implemented in this demo. "
                "Try another direction!"
            )
        }

    return {
        "success": True,
        "next_location": location["next_location"]
    }


def nav():
    current_location = 1

    print("Welcome to Indoor Navigation!")
    print("Destination: Classroom 118")

    while True:
        show_location(current_location)

        # Stop after displaying the final room number.
        if current_location == 13:
            print("\nNavigation complete. Thanks for testing!")
            break

        # Process the destination photo before ending.
        if current_location == 12:
            current_location = building[12]["next_location"]
            continue

        direction = input(
            "Choose a direction (left/right/straight), "
            "or type 'quit': "
        ).strip().lower()

        if direction == "quit":
            print("Navigation ended.")
            break

        result = move(current_location, direction)

        if result["success"]:
            current_location = result["next_location"]
        else:
            print("\n" + result["message"])
            print("You are still at the same location.")


if __name__ == "__main__":
    nav()

