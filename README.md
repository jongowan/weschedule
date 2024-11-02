# Project Documentation: WeSchedule

## Project Overview

WeSchedule is a Discord bot designed to assist in scheduling flexible events, such as a Dungeons & Dragons session. This bot allows users to input their availability across various levels and helps identify the most optimal time for a group event by analyzing these availability inputs. 

### Key Objectives

1. Enable users to input time spans of availability with varying levels.
2. Provide a priority-based system to indicate preferred time spans.
3. Offer a flexible command for users to check group availability and determine the best meeting time.
4. Plan for future GUI support to facilitate availability entry and scheduling visualization.

## Availability Levels

Each user will specify their availability for a given time span according to one of the following levels:

### 1. Not Available
   - **Description**: Time spans where the user is completely unavailable.
   - **Behavior**: If a time span is marked as "Not Available" for a user, it will be ignored for scheduling.

### 2. Available
   - **Description**: Time spans where the user is available for scheduling.
   - **Attributes**:
     - **Priority**: A positive floating-point number indicating the user's preference for that time span (higher priority is better).
     - **Comment (Optional)**: An additional note the user can add to clarify their availability.

### 3. Unknown
   - **Description**: Time spans where the user's availability is uncertain.
   - **Attributes**:
     - **Priority**: A priority level similar to "Available."
     - **Comment**: An optional comment, similar to "Available."
     - **Likelihood**: A percentage indicating how likely the time span is to become an "Available" one.

### Rules for Time Span Specification

1. Users can only assign one availability level to each time span.
2. If a user specifies a new availability level for a time span that overlaps with an existing entry, the new entry will automatically overwrite the old one.

## Scheduling and Command Functionality

When users wish to check the group’s availability, they can specify the following parameters:

1. **Minimum and Maximum Time Span**: Defines the range of time to evaluate. Any availability outside these bounds is ignored.
2. **Required Users**: A list of users who must be available for the time span to be considered. If any required user is marked as "Not Available," that time span is disregarded.

The scheduler will use an unspecified algorithm to identify the most optimal time span that:

1. Maximizes availability for the largest number of participants.
2. Accounts for user priorities and likelihoods.

### Scheduling Output

- The scheduling command will return the most suitable time span.
- Relevant comments for the selected time span will be displayed in the output.

## Future Enhancements

- **Graphical User Interface (GUI)**: A planned extension will introduce a GUI to make availability entry and scheduling review easier.
- **Enhanced Scheduling Visualization**: A GUI for scheduling results may also be implemented in future versions.

---

With WeSchedule, users can efficiently coordinate events by managing their availability in a detailed and flexible manner, enhancing the scheduling experience within Discord.
