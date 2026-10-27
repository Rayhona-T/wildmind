"""Shared feature order, category mapping, and validation constants."""

from __future__ import annotations

FEATURE_NAMES: list[str] = [
    "hair",
    "feathers",
    "eggs",
    "milk",
    "airborne",
    "aquatic",
    "predator",
    "toothed",
    "backbone",
    "breathes",
    "venomous",
    "fins",
    "legs",
    "tail",
    "domestic",
    "catsize",
]

BINARY_FEATURES: tuple[str, ...] = tuple(name for name in FEATURE_NAMES if name != "legs")
LEGS_VALUES: tuple[int, ...] = (0, 2, 4, 5, 6, 8)

CATEGORIES: dict[int, dict] = {
    1: {
        "id": 1,
        "name": "Mammals",
        "slug": "mammals",
        "accent": "#FFD17A",
        "habitat": "forest-clearing",
        "examples": ["lion", "elephant", "dolphin"],
        "description": "Animals that typically produce milk. In this dataset the class includes land mammals and some aquatic mammals.",
        "reward": "Lantern of the Clearing",
    },
    2: {
        "id": 2,
        "name": "Birds",
        "slug": "birds",
        "accent": "#A7DDF5",
        "habitat": "bird-canopy",
        "examples": ["eagle", "penguin", "flamingo"],
        "description": "Feathered animals. Flight is common but not required — penguins are birds in this scheme.",
        "reward": "Canopy Windchime",
    },
    3: {
        "id": 3,
        "name": "Reptiles",
        "slug": "reptiles",
        "accent": "#8CA889",
        "habitat": "sunlit-rocks",
        "examples": ["tortoise", "pitviper"],
        "description": "A small, varied class in this dataset. It is not a complete modern reptile taxonomy.",
        "reward": "Sunstone Marker",
    },
    4: {
        "id": 4,
        "name": "Fish",
        "slug": "fish",
        "accent": "#8BCBC3",
        "habitat": "aquatic-pond",
        "examples": ["tuna", "carp", "seahorse"],
        "description": "Mostly aquatic animals with fins. The dataset class is a practical grouping, not every aquatic vertebrate.",
        "reward": "Pond Ripple Bell",
    },
    5: {
        "id": 5,
        "name": "Amphibians",
        "slug": "amphibians",
        "accent": "#B6A4E8",
        "habitat": "wetland",
        "examples": ["frog", "newt", "toad"],
        "description": "A very small class in the Zoo dataset, which makes evaluation for this group especially unstable.",
        "reward": "Mist Lantern",
    },
    6: {
        "id": 6,
        "name": "Insects",
        "slug": "insects",
        "accent": "#F5EBD5",
        "habitat": "flower-meadow",
        "examples": ["butterfly", "bee", "flea"],
        "description": "Six-legged invertebrates in this dataset's labeling scheme.",
        "reward": "Meadow Firefly Jar",
    },
    7: {
        "id": 7,
        "name": "Other invertebrates",
        "slug": "invertebrates",
        "accent": "#635C9B",
        "habitat": "tide-pool",
        "examples": ["octopus", "crab", "starfish"],
        "description": "Invertebrates that are not labeled as insects in this dataset.",
        "reward": "Tide Pool Compass",
    },
}

FEATURE_GROUPS = {
    "body": ["hair", "feathers", "backbone", "toothed"],
    "biology": [
        "eggs",
        "milk",
        "airborne",
        "aquatic",
        "predator",
        "breathes",
        "venomous",
        "fins",
    ],
    "physical": ["legs", "tail", "domestic", "catsize"],
}

FEATURE_LABELS = {
    "hair": "Hair",
    "feathers": "Feathers",
    "eggs": "Eggs",
    "milk": "Milk",
    "airborne": "Airborne",
    "aquatic": "Aquatic",
    "predator": "Predator",
    "toothed": "Teeth",
    "backbone": "Backbone",
    "breathes": "Breathes",
    "venomous": "Venomous",
    "fins": "Fins",
    "legs": "Legs",
    "tail": "Tail",
    "domestic": "Domestic",
    "catsize": "Cat-sized",
}


def category_payload(class_id: int) -> dict:
    info = CATEGORIES[int(class_id)]
    return {
        "id": info["id"],
        "name": info["name"],
        "slug": info["slug"],
        "accent": info["accent"],
        "habitat": info["habitat"],
        "examples": list(info["examples"]),
        "description": info["description"],
        "reward": info["reward"],
    }


def all_categories() -> list[dict]:
    return [category_payload(i) for i in range(1, 8)]
