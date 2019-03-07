import { groupWeekends } from "./SeanceController";

test("Group weekends (last day is a sunday)", () => {
  const days = [
    new Date("2019-02-14T00:00:00.000Z"),
    new Date("2019-02-15T00:00:00.000Z"),
    new Date("2019-02-16T00:00:00.000Z"),
    new Date("2019-02-17T00:00:00.000Z"),
    new Date("2019-02-22T00:00:00.000Z"),
    new Date("2019-02-23T00:00:00.000Z"),
    new Date("2019-02-24T00:00:00.000Z"),
    new Date("2019-03-01T00:00:00.000Z"),
    new Date("2019-03-02T00:00:00.000Z"),
    new Date("2019-03-03T00:00:00.000Z")
  ];

  const weekendGroups = groupWeekends(days.map(d => d.getTime()));
  const expected = [
    [
      new Date("2019-02-15T15:00:00.000Z").getTime(),
      new Date("2019-02-16T22:00:00.000Z").getTime(),
      new Date("2019-02-17T22:00:00.000Z").getTime()
    ],
    [
      new Date("2019-02-22T15:00:00.000Z").getTime(),
      new Date("2019-02-23T22:00:00.000Z").getTime(),
      new Date("2019-02-24T22:00:00.000Z").getTime()
    ],
    [
      new Date("2019-03-01T15:00:00.000Z").getTime(),
      new Date("2019-03-02T22:00:00.000Z").getTime(),
      new Date("2019-03-03T22:00:00.000Z").getTime()
    ]
  ];

  expect(weekendGroups).toEqual(expected);
});

test("Group weekends (last day is a friday)", () => {
  const days = [
    new Date("2019-02-14T00:00:00.000Z"),
    new Date("2019-02-15T00:00:00.000Z"),
    new Date("2019-02-16T00:00:00.000Z"),
    new Date("2019-02-17T00:00:00.000Z"),
    new Date("2019-02-22T00:00:00.000Z"),
    new Date("2019-02-23T00:00:00.000Z"),
    new Date("2019-02-24T00:00:00.000Z"),
    new Date("2019-03-01T00:00:00.000Z")
  ];

  const weekendGroups = groupWeekends(days.map(d => d.getTime()));
  const expected = [
    [
      new Date("2019-02-15T15:00:00.000Z").getTime(),
      new Date("2019-02-16T22:00:00.000Z").getTime(),
      new Date("2019-02-17T22:00:00.000Z").getTime()
    ],
    [
      new Date("2019-02-22T15:00:00.000Z").getTime(),
      new Date("2019-02-23T22:00:00.000Z").getTime(),
      new Date("2019-02-24T22:00:00.000Z").getTime()
    ],
    [
      new Date("2019-03-01T15:00:00.000Z").getTime(),
      new Date("2019-03-02T22:00:00.000Z").getTime(),
      new Date("2019-03-03T22:00:00.000Z").getTime()
    ]
  ];

  expect(weekendGroups).toEqual(expected);
});

test("Group weekends (first day is a saturday)", () => {
  const days = [
    new Date("2019-02-16T00:00:00.000Z"),
    new Date("2019-02-17T00:00:00.000Z"),
    new Date("2019-02-22T00:00:00.000Z"),
    new Date("2019-02-23T00:00:00.000Z"),
    new Date("2019-02-24T00:00:00.000Z"),
    new Date("2019-03-01T00:00:00.000Z")
  ];

  const weekendGroups = groupWeekends(days.map(d => d.getTime()));
  const expected = [
    [
      new Date("2019-02-15T15:00:00.000Z").getTime(),
      new Date("2019-02-16T22:00:00.000Z").getTime(),
      new Date("2019-02-17T22:00:00.000Z").getTime()
    ],
    [
      new Date("2019-02-22T15:00:00.000Z").getTime(),
      new Date("2019-02-23T22:00:00.000Z").getTime(),
      new Date("2019-02-24T22:00:00.000Z").getTime()
    ],
    [
      new Date("2019-03-01T15:00:00.000Z").getTime(),
      new Date("2019-03-02T22:00:00.000Z").getTime(),
      new Date("2019-03-03T22:00:00.000Z").getTime()
    ]
  ];

  expect(weekendGroups).toEqual(expected);
});
