// Copyright (c) Aptos
// SPDX-License-Identifier: Apache-2.0

use aptos_aggregator::aggregator_extension::AggregatorID;
use move_deps::{
    move_binary_format::errors::PartialVMResult,
    move_core_types::gas_algebra::InternalGas,
    move_vm_runtime::native_functions::{NativeContext, NativeFunction},
    move_vm_types::{
        loaded_data::runtime_types::Type,
        natives::function::NativeResult,
        pop_arg,
        values::{Struct, StructRef, Value},
    },
};
use smallvec::smallvec;
use std::{collections::VecDeque, sync::Arc};

use crate::natives::aggregator_natives::{
    helpers::{get_aggregator_fields, unpack_aggregator_struct},
    NativeAggregatorContext,
};

/***************************************************************************************************
 * native fun add(aggregator: &mut Aggregator, value: u128);
 *
 *   gas cost: base_cost
 *
 **************************************************************************************************/
#[derive(Debug, Clone)]
pub struct AddGasParameters {
    pub base_cost: InternalGas,
}

fn native_add(
    gas_params: &AddGasParameters,
    context: &mut NativeContext,
    _ty_args: Vec<Type>,
    mut args: VecDeque<Value>,
) -> PartialVMResult<NativeResult> {
    assert!(args.len() == 2);

    // Get aggregator fields and a value to add.
    let value = pop_arg!(args, u128);
    let aggregator_ref = pop_arg!(args, StructRef);
    let (handle, key, limit) = get_aggregator_fields(&aggregator_ref)?;
    let id = AggregatorID::new(handle, key);

    // Get aggregator.
    let aggregator_context = context.extensions().get::<NativeAggregatorContext>();
    let mut aggregator_data = aggregator_context.aggregator_data.borrow_mut();
    let aggregator = aggregator_data.get_aggregator(id, limit);

    aggregator.add(value)?;

    // NOTE(Gas): O(1) cost: simple addition.
    let cost = gas_params.base_cost;

    Ok(NativeResult::ok(cost, smallvec![]))
}

pub fn make_native_add(gas_params: AddGasParameters) -> NativeFunction {
    Arc::new(move |context, ty_args, args| native_add(&gas_params, context, ty_args, args))
}

/***************************************************************************************************
 * native fun read(aggregator: &Aggregator): u128;
 *
 *   gas cost: base_cost
 *
 **************************************************************************************************/
#[derive(Debug, Clone)]
pub struct ReadGasParameters {
    pub base_cost: InternalGas,
}

fn native_read(
    gas_params: &ReadGasParameters,
    context: &mut NativeContext,
    _ty_args: Vec<Type>,
    mut args: VecDeque<Value>,
) -> PartialVMResult<NativeResult> {
    assert!(args.len() == 1);
    let aggregator_ref = pop_arg!(args, StructRef);

    // Extract fields from aggregator struct reference.
    let (handle, key, limit) = get_aggregator_fields(&aggregator_ref)?;
    let id = AggregatorID::new(handle, key);

    // Get aggregator.
    let aggregator_context = context.extensions().get::<NativeAggregatorContext>();
    let mut aggregator_data = aggregator_context.aggregator_data.borrow_mut();
    let aggregator = aggregator_data.get_aggregator(id, limit);

    let value = aggregator.read_and_materialize(aggregator_context.resolver, &id)?;

    // NOTE(Gas): O(1) cost: serialization/deserialization and potential
    // resolving to storage.
    let cost = gas_params.base_cost;

    Ok(NativeResult::ok(cost, smallvec![Value::u128(value)]))
}

pub fn make_native_read(gas_params: ReadGasParameters) -> NativeFunction {
    Arc::new(move |context, ty_args, args| native_read(&gas_params, context, ty_args, args))
}

/***************************************************************************************************
 * native fun sub(aggregator: &mut Aggregator, value: u128);
 *
 *   gas cost: base_cost
 *
 **************************************************************************************************/
#[derive(Debug, Clone)]
pub struct SubGasParameters {
    pub base_cost: InternalGas,
}

fn native_sub(
    gas_params: &SubGasParameters,
    context: &mut NativeContext,
    _ty_args: Vec<Type>,
    mut args: VecDeque<Value>,
) -> PartialVMResult<NativeResult> {
    assert!(args.len() == 2);

    // Get aggregator fields and a value to subtract.
    let value = pop_arg!(args, u128);
    let aggregator_ref = pop_arg!(args, StructRef);
    let (handle, key, limit) = get_aggregator_fields(&aggregator_ref)?;
    let id = AggregatorID::new(handle, key);

    // Get aggregator.
    let aggregator_context = context.extensions().get::<NativeAggregatorContext>();
    let mut aggregator_data = aggregator_context.aggregator_data.borrow_mut();
    let aggregator = aggregator_data.get_aggregator(id, limit);

    // For first version of `Aggregator` (V1), subtraction always materializes
    // the value first. While this limits commutativity, it is sufficient for
    // now.
    // TODO: change this when we implement commutative subtraction.
    // aggregator.materialize(aggregator_context, &id)?;
    aggregator.sub(value)?;

    // NOTE(Gas): O(1) cost: simple subtraction.
    let cost = gas_params.base_cost;

    Ok(NativeResult::ok(cost, smallvec![]))
}

pub fn make_native_sub(gas_params: SubGasParameters) -> NativeFunction {
    Arc::new(move |context, ty_args, args| native_sub(&gas_params, context, ty_args, args))
}

/***************************************************************************************************
 * native fun destroy(aggregator: Aggregator);
 *
 *   gas cost: base_cost
 *
 **************************************************************************************************/
#[derive(Debug, Clone)]
pub struct DestroyGasParameters {
    pub base_cost: InternalGas,
}

fn native_destroy(
    gas_params: &DestroyGasParameters,
    context: &mut NativeContext,
    _ty_args: Vec<Type>,
    mut args: VecDeque<Value>,
) -> PartialVMResult<NativeResult> {
    assert!(args.len() == 1);

    // First, unpack the struct.
    let aggregator_struct = pop_arg!(args, Struct);
    let (handle, key, _) = unpack_aggregator_struct(aggregator_struct)?;

    // Get aggregator data.
    let aggregator_context = context.extensions().get::<NativeAggregatorContext>();
    let mut aggregator_data = aggregator_context.aggregator_data.borrow_mut();

    // Actually remove the aggregator.
    let id = AggregatorID::new(handle, key);
    aggregator_data.remove_aggregator(id);

    // NOTE(Gas): O(1) cost: simple destruction of a small struct.
    let cost = gas_params.base_cost;

    Ok(NativeResult::ok(cost, smallvec![]))
}

pub fn make_native_destroy(gas_params: DestroyGasParameters) -> NativeFunction {
    Arc::new(move |context, ty_args, args| native_destroy(&gas_params, context, ty_args, args))
}

/***************************************************************************************************
 * module
 *
 **************************************************************************************************/
#[derive(Debug, Clone)]
pub struct GasParameters {
    pub add: AddGasParameters,
    pub read: ReadGasParameters,
    pub sub: SubGasParameters,
    pub destroy: DestroyGasParameters,
}

pub fn make_all(gas_params: GasParameters) -> impl Iterator<Item = (String, NativeFunction)> {
    let natives = [
        ("add", make_native_add(gas_params.add)),
        ("read", make_native_read(gas_params.read)),
        ("sub", make_native_sub(gas_params.sub)),
        ("destroy", make_native_destroy(gas_params.destroy)),
    ];

    crate::natives::helpers::make_module_natives(natives)
}
