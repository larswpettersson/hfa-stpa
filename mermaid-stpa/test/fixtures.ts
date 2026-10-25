export const AEB = `stpa-beta
    title Automatic Emergency Braking
    accTitle: AEB control structure
    accDescr: An AEB controller commands the brakes of a vehicle and receives speed feedback.

    controller aeb["AEB controller"]
    process car["Vehicle"]

    aeb -->|"Brake request"| car
    car -.->|"Wheel speed"| aeb
    car -.->|"Radar range"| aeb
`;

export const HIERARCHY = `stpa-beta
    controller ops["Operator"]
    controller ctl["Level crossing controller"]
    process xing["Crossing"]
    ops --> ctl
    ctl -.-> ops
    ctl -->|"Lower barrier"| xing
    xing -.->|"Barrier position"| ctl
    ops -->|"Emergency stop"| xing
`;
