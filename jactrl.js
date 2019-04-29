"use strict";

function JaCtrl() {
	var _this = this;
	/* Element */
	var _editControler = null;
	var _scrollLayoutLeft = null;
	var _scrollLayoutTop = null;

	/* Layout Value */
	var _offsetLeft = null;
	var _timeTableWidth = null;
	var _leftPadding = null;

	/* touch coordinate */
	var _startBarFirstTouchX = 0;
	var _endBarFirstTouchX = 0;

	/* init value for time calculation */
	var _minimumWidth = 0;
	var _viewEndHour = 0;
	var _viewStartHour = 0;
	var _oneHourWidth = 0;
	var _oneMinuteWidth = 0;
	var _viewTimeInterval = 0;
	var _assignDefaultMinute = 0;
	var _assignMinMinute = 0;

	/* edit mode */
	var _editMode = null;

	/* employee info */
	var _targetId = null;
	var _targetName = null;

	var _editControlerWidth = 0;

	this.JaControler_init = function(editControler) {
		_editControler = $("#" + editControler);
	};

	this.JaControler_setLayoutValue = function(offsetLeft, timeTableWidth, leftPadding, scrollLayoutLeft, scrollLayoutTop) {
		_offsetLeft = offsetLeft;
		_timeTableWidth = timeTableWidth;
		_leftPadding = leftPadding;
		_scrollLayoutLeft = $("#" + scrollLayoutLeft);
		_scrollLayoutTop = $("#" + scrollLayoutTop);
	};

	this.JaControler_setGlobalValue = function(minimumWidth, viewEndHour, viewStartHour, oneHourWidth, oneMinuteWidth, viewTimeInterval, assignDefaultMinute, assignMinMinute) {
		_minimumWidth = minimumWidth;
		_viewEndHour = viewEndHour;
		_viewStartHour = viewStartHour;
		_oneHourWidth = oneHourWidth;
		_oneMinuteWidth = oneMinuteWidth;
		_viewTimeInterval = viewTimeInterval;
		_assignDefaultMinute = assignDefaultMinute;
		_assignMinMinute = assignMinMinute;
	};

	this.JaControler_setAuth = function(isModified) {
		_editMode = isModified;
	}

	this.JaControler_setTargetData = function(targetID, targetName) {
		_targetId = targetID;
		_targetName = targetName;
	};

	this.JaControler_getTargetData = function() {
		return ({
			"targetId" : _targetId,
			"targetName" : _targetName
		});
	};

	this.JaControler_showEditControler = function() {
		if (_editControler.hasClass("displayNone"))
			_editControler.removeClass("displayNone");
		else
			return;
	};

	this.JaControler_hideEditControler = function() {
		if (_editControler.hasClass("displayNone"))
			return;
		else
			$(_editControler).addClass("displayNone");
	};

	this.JaControler_setSize = function(left, top, width) {
		if (left != null && left != undefined) {
			_editControler.css("left", left);
		}

		if (top != null && top != undefined) {
			_editControler.css("top", top);
		}

		if (width != null && width != undefined) {
			_editControler.css("width", width);
		}
	};

	this.JaControler_getJaControler = function() {
		return _editControler;
	};

	this.JaControler_setWidth = function(width) {
		_editControlerWidth = width;
	};

	this.JaControler_getWidth = function() {
		return _editControlerWidth;
	};

	this.JaControler_setStartBarFirstTouchX = function(x) {
		_startBarFirstTouchX = x;
	};

	this.JaControler_bindTouchEvent = function() {
		$(".normalStart", _editControler).on("touchstart", this.JaControler_onTimeCtrlTouchStartEvt);
		$(".normalStart", _editControler).on("touchmove", {
			IS_START : "START"
		}, this.JaControler_onTimeCtrlMoveEvt);
		$(".normalStart", _editControler).on("touchend", this.JaControler_onTimeCtrlEndEvt);
		$(".normalEnd", _editControler).on("touchstart", this.JaControler_onTimeCtrlTouchStartEvt);
		$(".normalEnd", _editControler).on("touchmove", {IS_START : "END"}, this.JaControler_onTimeCtrlMoveEvt);

		$(".normalEnd", _editControler).on("touchend", this.JaControler_onTimeCtrlEndEvt);
	};

	this.JaControler_onXBtnEvt = function(e) {
		if (e != null) {
			e.preventDefault();
		}

		$(".editBubbleJobName", _editControler).text("");
		$(".editBubbleJobOpName", _editControler).text("");
		$(" > p", _editControler).eq(0).text("");
		$(".editBubblePlate", _editControler).text("");

		_this.JaControler_hideEditControler();
		_this.JaControler_setSize(null, null, null);
		_this.JaControler_setWidth(0);

		wafn.onCloseBtn();
	};

	this.JaControler_onConfirmBtnEvt = function(e) {
		e.preventDefault();

		wafn.onConfirmBtn();
	};

	this.JaControler_onScheduleBtnEvt = function(e, $this) {
		e.preventDefault();

		wafn.onScheduleBtn($this);
	};

	this.JaControler_onInfoBtnEvt = function(e) {
		e.preventDefault();

		wafn.onDetailBtn();
	};

	this.JaControler_onFiRoBtnEvt = function(e) {
		e.preventDefault();

		wafn.onFiMoveBtn();
	};

	this.JaControler_onFiWashBtnEvt = function(e) {
		e.preventDefault();

		wafn.onWashingBtn();
	};

	this.JaControler_onRemoveBtnEvt = function(e) {
		e.preventDefault();

		wafn.onRemoveBtn();
	};

	this.JaControler_onDeallocateBtnEvt = function(e) {
		e.preventDefault();

		wafn.onDeallocateBtn();
	};

	this.JaControler_onJobStartBtnEvt = function(e) {
		e.preventDefault();

		_callBack_jobStartFunc();
	};

	this.JaControler_onTimeCtrlTouchStartEvt = function(e) {
		e.preventDefault();
		e.stopPropagation();

		var scrollLeft = _scrollLayoutLeft.scrollLeft();
		var width = parseInt(_editControler.outerWidth());
		var left = parseInt(_editControler.offset().left - _offsetLeft) + scrollLeft;
		var right = parseInt(left + width);

		_this.JaControler_setSize(left, null, width);
		_startBarFirstTouchX = left;
		_endBarFirstTouchX = right;
	};

	this.JaControler_onTimeCtrlMoveEvt = function(e) {
		e.preventDefault();
		e.stopPropagation();

		var left = 0;
		var width = 0;
		var scrollLeft = _scrollLayoutLeft.scrollLeft();
		var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
		left = touch.clientX - _offsetLeft + scrollLeft;

		if (e.data.IS_START == "START") {
			if (left <= _leftPadding)
				left = _leftPadding;

			width = parseInt(_this.JaControler_getWidth());
			if (width < _minimumWidth) {
				width = _minimumWidth;
			}

			_this.JaControler_setSize(left, null, width);
		} else if (e.data.IS_START == "END") {
			var maxWidth = ((_viewEndHour - _viewStartHour) * _oneHourWidth) + _leftPadding - _startBarFirstTouchX;
			width = parseInt(_this.JaControler_getWidth()) + (left - _endBarFirstTouchX);
			if (width >= maxWidth)
				width = maxWidth;

			if (width < _minimumWidth) {
				width = _minimumWidth;
			}

			_this.JaControler_setSize(_startBarFirstTouchX, null, width);
		}
		_this.JaControler_displayTimeAndInfo();
	};

	this.JaControler_onTimeCtrlEndEvt = function(e) {
		e.preventDefault();
		e.stopPropagation();

		var x = 0;
		var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
		x = touch.clientX - _offsetLeft;

		var scrollLeft = _scrollLayoutLeft.scrollLeft();
		x = x + scrollLeft;

		if (x <= _leftPadding)
			x = _leftPadding;

		_startBarFirstTouchX = x;
		_this.JaControler_setWidth(_editControler.outerWidth());
		_this.JaControler_displayTimeAndInfo();
	};

	this.JaControler_displayTimeAndInfo = function(timeTxtS, timeTxtE, lts) {
		var width = _minimumWidth * (_assignDefaultMinute / _assignMinMinute);
		if (timeTxtS != null && timeTxtE != null) {
			$(".editBubbleStart", _editControler).html(timeTxtS + "<br>" + timeTxtE);
			$(".editBubbleEnd", _editControler).addClass("displayNone");
			$(".ja_stime", _editControler).text(timeTxtS);
			$(".ja_etime", _editControler).text(timeTxtE);
		} else {
			width = _editControler.outerWidth();
			var scrollLeft = _scrollLayoutLeft.scrollLeft();
			var left = _editControler.offset().left - _offsetLeft + scrollLeft - _leftPadding;

			var intervalWidth = Math.floor(_oneMinuteWidth * _viewTimeInterval);

			var sHour = Math.floor(left / _oneHourWidth) + _viewStartHour;
			var right = left + width;
			var eHour = Math.floor(right / _oneHourWidth) + _viewStartHour;
			var sMin = 0;
			var eMin = 0;
			if (lts == true) {
				sMin = Math.floor((left % _oneHourWidth) / _oneMinuteWidth) * 1;
				eMin = Math.floor((right % _oneHourWidth) / _oneMinuteWidth) * 1;
			} else {
				sMin = Math.floor((left % _oneHourWidth) / intervalWidth) * _viewTimeInterval;
				eMin = Math.floor((right % _oneHourWidth) / intervalWidth) * _viewTimeInterval;
			}
			
			var tempDate = new Date(wafn._selectedDate.getTime());
			wafn._selectedDate.setHours(sHour, sMin, 0, 0);
			timeTxtS = wafn._selectedDate.getDateFormat(g_timeshortformat);
			$(".ja_stime", _editControler).text(timeTxtS);
			$(".editBubbleStartDate", _editControler).data("wavalue", getLocalDateFormatString(wafn._selectedDate));
			$(".editBubbleStart", _editControler).text(timeTxtS).data("wavalue", wafn._selectedDate.getDateFormat(g_timeshortformat));
			wafn._selectedDate.setHours(eHour, eMin, 0, 0);
			timeTxtE = wafn._selectedDate.getDateFormat(g_timeshortformat);
			$(".ja_etime", _editControler).text(timeTxtE);
			$(".editBubbleEndDate", _editControler).data("wavalue", getLocalDateFormatString(wafn._selectedDate));
			$(".editBubbleEnd", _editControler).text(timeTxtE).data("wavalue", wafn._selectedDate.getDateFormat(g_timeshortformat));

			$(".editBubbleEnd", _editControler).removeClass("displayNone");
			wafn._selectedDate.setTime(tempDate.getTime());
		}
		var PlateNo = wafn._hidedScheduleObj != null ? wafn._hidedScheduleObj.data("jobvalue").PlateNo : $(".orderSelect > input").data("plateno");
		$(".editBubblePlate", _editControler).text(PlateNo);

		_this.JaControler_jobBindDataSetting();
	};

	this.JaControler_jobBindDataSetting = function() {
		var el = _editControler.find('[data-wa-bind-context]');
		for(var i = 0; i < el.length; i++) {
			var k = $(el[i]).data('wa-bind-context');
			switch (k) {
				case "RepairOrderSeq":
				  var RepairOrderSeq = wafn._hidedScheduleObj != null ? wafn._hidedScheduleObj.data("jobvalue").RepairOrderSeq : $(".orderSelect > input").data("repairorderseq");
					$(el[i]).data('wavalue', RepairOrderSeq);
					break;
				case "BaySeq":
					$(el[i]).data('wavalue', _this.JaControler_getTargetData().targetId);
					break;
				case "BayName":
					$(el[i]).data('wavalue', _this.JaControler_getTargetData().targetName);
					break;
				case "PlateNo":
				  var PlateNo = wafn._hidedScheduleObj != null ? wafn._hidedScheduleObj.data("jobvalue").PlateNo : $(".orderSelect > input").data("plateno");
					$(el[i]).data('wavalue', PlateNo);
					break;
				case "JobScheduleSeq":
					$(el[i]).data('wavalue', wafn._hidedScheduleObj != null ? wafn._hidedScheduleObj.data("jobvalue").JobScheduleSeq : "");
					break;
				case "BayJobScheduleSeq":
					$(el[i]).data('wavalue', wafn._hidedScheduleObj != null ? wafn._hidedScheduleObj.data("jobvalue").BayJobScheduleSeq : "");
					break;
				case "BaySeq_Old":
					$(el[i]).data('wavalue', wafn._hidedScheduleObj != null ? wafn._hidedScheduleObj.data("jobvalue").BaySeq : "");
					break;
			}
		}
	}

	this.JaControler_reArrangeBubbleBox = function() {
		var left = _editControler.offset().left;
		var isOpposionFlag = false;
		var isVerticalFlag = ($(".controlBox").height() - _editControler.offset().top) > (_editControler.height() + $(".editBubble", _editControler).height()) ? true : false;

		if ((left - parseInt($("#ja_time_over").scrollLeft())) > 800) {
			isOpposionFlag = true;
		} else {
			isOpposionFlag = false;
		}

		$(".editBubble", _editControler).removeClass("OppVerti").removeClass("Opposition").removeClass("Vertical");
		if (isOpposionFlag == true && isVerticalFlag == true) {
			$(".editBubble", _editControler).addClass("OppVerti");
		} else if (isOpposionFlag == true) {
			$(".editBubble", _editControler).addClass("Opposition");
		} else if (isVerticalFlag == true) {
			$(".editBubble", _editControler).addClass("Vertical");
		}
	};

	this.JaControler_setStatusCode = function() {
		var JobStatusCode = "J00";
		var BayJobScheduleSeq = 0;
		var MoreThan1Day = false;
		var IsOverDeliveryTime = "";
		var IsStartDelayChecked = false;
		var IsFinishDelayChecked = false;
		var RepairOrderStatusCode = "";
		var PassYN = "Y";

		if (wafn._hidedScheduleObj != null) {
			var jobValue = wafn._hidedScheduleObj.data("jobvalue");
			JobStatusCode = jobValue.JobStatusCode;
			BayJobScheduleSeq = jobValue.BayJobScheduleSeq;
			MoreThan1Day = jobValue.MoreThan1Day;
			IsOverDeliveryTime = jobValue.IsOverDeliveryTime == "Y" ? "overtime" : "";
			IsStartDelayChecked = jobValue.IsStartDelayChecked;
			IsFinishDelayChecked = jobValue.IsFinishDelayChecked;
			RepairOrderStatusCode = jobValue.RepairOrderStatusCode;
			PassYN = jobValue.PassYN;
		}

		var colorClass = (PassYN == "Y") ? "step_" + JobStatusCode : "step_passX";
		_editControler.removeClass().addClass("allocation").addClass(colorClass).addClass(IsOverDeliveryTime);
		$(".editBtn button", _editControler).attr("disabled", "disabled");
		$(".JaBtnInfo", _editControler).removeAttr("disabled");
		$(".JaBtnFIRO", _editControler).removeAttr("disabled");
		$(".JaBtnFIwash", _editControler).removeAttr("disabled");
		$(".timeHandler, .timeHandler button", _editControler).removeClass("displayNone");

		if (_editMode && RepairOrderStatusCode != "R06" && PassYN == "Y") {
			switch (JobStatusCode) {
				case "J00":
					$(".JaBtnConfirm", _editControler).removeAttr("disabled");
					$(".JaBtnSchedule", _editControler).removeAttr("disabled");
					if (BayJobScheduleSeq) {
						$(".JaBtnDeallocate", _editControler).removeAttr("disabled");
					}
				break;
				case "J01":
				case "J03":
				case "J05":
					$(".JaBtnConfirm", _editControler).removeAttr("disabled");

					$(".normalStart", _editControler).addClass("displayNone");
				break;
				case "J02":
					$(".JaBtnRemove", _editControler).removeAttr("disabled");

					$(".timeHandler", _editControler).addClass("displayNone");
				break;
				case "J06":
					if (IsStartDelayChecked == true) {
						$(".JaBtnConfirm", _editControler).removeAttr("disabled");
						$(".JaBtnSchedule", _editControler).removeAttr("disabled");
						$(".JaBtnDeallocate", _editControler).removeAttr("disabled");
					} else if (IsFinishDelayChecked == true) {
						$(".JaBtnConfirm", _editControler).removeAttr("disabled");

						$(".normalStart", _editControler).addClass("displayNone");
					} else {
						$(".timeHandler", _editControler).addClass("displayNone");
					}
				break;
				case "J04":
				case "J07":
					$(".timeHandler", _editControler).addClass("displayNone");
				break;
			}

			if (MoreThan1Day == true) {
				$(".timeHandler", _editControler).addClass("displayNone");
			}
		} else {
			$(".timeHandler", _editControler).addClass("displayNone");
		}
	}
}
