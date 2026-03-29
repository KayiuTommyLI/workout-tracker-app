# Workout Tracker App

## Overview
The Workout Tracker App is a web application designed to help users track their workout routines, including repetitions, sets, and weights. It utilizes Google Sheets as a database to store workout data and provides personalized recommendations for future workouts based on user history.

## Features
- Input workout routines with details such as repetitions, sets, and weights.
- Store and retrieve workout data using Google Sheets.
- Generate recommendations for the next day's workout based on previous entries.
- User-friendly interface for easy navigation and data entry.

## Project Structure
```
workout-tracker-app
├── src
│   ├── index.html          # Main HTML document
│   ├── css
│   │   └── styles.css      # Styles for the application
│   ├── js
│   │   ├── app.js          # Main JavaScript entry point
│   │   ├── sheetsAPI.js    # Google Sheets API interaction
│   │   ├── workoutCalculator.js # Logic for workout recommendations
│   │   └── utils.js        # Utility functions
│   ├── components
│   │   ├── workoutForm.js   # Component for inputting workouts
│   │   ├── workoutLog.js     # Component for displaying workout history
│   │   └── recommendations.js # Component for workout recommendations
│   └── config
│       └── config.js        # Configuration settings
├── package.json             # npm configuration file
└── README.md                # Project documentation
```

## Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd workout-tracker-app
   ```
3. Install the dependencies:
   ```
   npm install
   ```

## Usage
1. Open `src/index.html` in a web browser.
2. Use the workout form to input your workout details.
3. View your workout history and receive recommendations for your next workout.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.