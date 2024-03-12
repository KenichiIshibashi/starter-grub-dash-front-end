const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// TODO: Implement the /orders handlers needed to make the tests pass
function list(req, res) {
  return res.json({ data: orders });
}

function orderExists(req, res, next) {
  const orderId = req.params.orderId;
  const foundOrderId = orders.find((order) => order.id === orderId);
  if (foundOrderId) {
    res.locals.order = foundOrderId;
    res.status(200).json;
    return next();
  }
  next({
    status: 404,
    message: `Order id is not found: ${req.params.orderId}`,
  });
}

function create(req, res) {
  const { data: { deliverTo, mobileNumber, dishes, status } = {} } = req.body;

  const order = {
    id: nextId(),
    deliverTo,
    mobileNumber,
    status,
    dishes,
  };
  orders.push(order);
  res.status(201).json({ data: order });
}

function validateProperties(req, res, next) {
  const { data } = req.body;
  const requiredProps = ["deliverTo", "mobileNumber", "dishes"];

  requiredProps.forEach((prop) => {
    if (!data[prop]) {
      next({
        status: 400,
        message: `Order must include a ${prop}`,
      });
    }
    if (prop === "dishes") {
      // check if data['dishes'] is an array OR has length > 0 ||
      if (data[prop].length === 0 || !Array.isArray(data[prop])) {
        next({
          status: 400,
          message: "Order must include at least one dish",
        });
      }
      // check if each dish contains quantity
      data[prop].forEach((dish, index) => {
        if (
          !dish["quantity"] ||
          !Number.isInteger(dish["quantity"]) ||
          dish["quantity"] <= 0
        ) {
          next({
            status: 400,
            message: `Dish ${index} must have a quantity that is an integer greater than 0`,
          });
        }
      });
    }
  });
  return next();
}

function read(req, res) {
  res.json({ data: res.locals.order });
}

function update(req, res, next) {
  let order = res.locals.order;
  const orderId = order.id;
  const { data: { id, deliverTo, mobileNumber, status, dishes } = {} } =
    req.body;
  if (id && orderId !== id) {
    return next({
      status: 400,
      message: `Order id does not match route id:  Order: ${id}, Route: ${orderId}.`,
    });
  } else if (!status || status === "invalid") {
    return next({
      status: 400,
      message:
        "Order must have a status of pending, preparing, out-for-delivery, delivered.",
    });
  } else if (status === "delivered") {
    return next({
      status: 400,
      message: "A delivered order cannot be changed.",
    });
  }

  order.deliverTo = deliverTo;
  order.mobileNumber = mobileNumber;
  order.status = status;
  order.dishes = dishes;

  res.json({ data: order });
}

function remove(req, res, next) {
  const orderId = req.params.orderId;
  const index = orders.findIndex((order) => order.id === orderId);

  // If order does not exist, return 404
  if (index === -1) {
    return next({
      status: 404,
      message: `Order with ID ${orderId} not found.`,
    });
  }

  // If order exists but status is not 'pending', return 400
  if (orders[index].status !== "pending") {
    return next({
      status: 400,
      message: 'Order status must be "pending" to delete.',
    });
  }

  // Remove the order from the array
  orders.splice(index, 1);

  // Send a 204 response to indicate successful deletion
  res.sendStatus(204);
}

module.exports = {
  list,
  read: [orderExists, read],
  create: [validateProperties, create],
  update: [orderExists, validateProperties, update],
  remove: [orderExists, remove], // Add the remove function to exports
};
