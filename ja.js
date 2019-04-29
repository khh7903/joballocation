function pageInit(fnName) {
  debug("pageInit", fnName);

  // hide softkeyboard area when softkeybvoard showing
  _hideKeyboardArea();

  // fetch js from queue
  window.view && window.view.ready();


  wafn.init();
}

wafn = new GSBF();



function GSBF() {
  this._jactrl = null;
  this._targetTemplate = null;
  this._inputScheduleTemplate = null;
  this._controlerTemplate = null;
  this._reservationTemplate = null;
  this._deallocateTemplate = null;
  this._timeTableLeftPadding = 0;
  this._viewStartHour = 0;
  this._viewEndHour = 24;
  this._oneHourWidth = 0;
  this._assignMinMinute = 4;
  this._oneMinuteWidth = 0;
  this._assignDefaultMinute = 60;
  this._minimumWidth = 0;
  this._leftOffset = 0;
  this._appointmentSeq = 0;
  this._repairOrderList = null;
  this._selectedDate = new Date();
  this._intervalWidth = 0;
  this._viewTimeInterval = 6;
  this._selectedJob = null;
  this._hidedScheduleObj = null;
  this._startX = 0;
  this._startY = 0;
  this._ja_job_assign = null;
  this._ja_fi_assign = null;
  this._ja_washing_assign = null;
  this._isRoEdit = false;

  this.init = function() {
    debug("init ja");

  	wafn._targetTemplate = Handlebars.compile($('#template-ja-targetname').html());
  	wafn._inputScheduleTemplate = Handlebars.compile($('#template-ja-inputschedule').html());
  	wafn._controlerTemplate = Handlebars.compile($('#template-ja-controler').html());
    wafn._reservationTemplate = Handlebars.compile($('#template-ja-reservation').html());
    wafn._deallocateTemplate = Handlebars.compile($('#template-ja-deallocate').html());

    wafn.setPermission();

    wafn.registerHelper();

  	wafn.initLayout();
  	wafn.initValue();
  	wafn.initEditControler();

    _bindEvents(null, "#jaContent");

    wafn._appointmentSeq = getAppointmentSeq();

  	wafn.getRepairOrderList(wafn._appointmentSeq);
  	wafn.onTodayBtnEvt();

    if(enableBatchJobAlloation) {
      $(".orderWrap .reservationSearchBox").removeClass("displayNone");
      wafn.onReservationSearchTypeChange("jaSetSearchToday");
    }
  }

  this.setPermission = function() {
    wafn._ja_job_assign = checkPermission("ja_job_assign");
    wafn._ja_fi_assign = checkPermission("ja_fi_assign");
    wafn._ja_washing_assign = checkPermission("ja_washing_assign");
  }

  this.onReservationSearchTypeChange = function(c) {
    if (typeof c == "string") {
      $("#" + c).prop("checked", true);
    }

    var $inputDisplayPeriod = $("#ja_display_period");
    $("#customerListBox").empty();
    var startDate = new Date();
    var endDate = new Date();
    var id = $(c).attr("id");
    switch (id) {
      case "jaSetSearchToday":
        break;
      case "jaSetSearchWeek":
          startDate.setDate(startDate.getDate() - 6);
        break;
      case "jaSetSearchMonth":
          startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "jaSetSearchPeriod":
          $inputDisplayPeriod.val(null);
          window.view.setString("title", "Start Date");
          window.view.showDateTimePicker("wafn.callbackChangeDatePicker", pushObject($inputDisplayPeriod), startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate(), startDate.getHours(), startDate.getMinutes(), 0);
          return;
        break;
    }
    wafn.getResevationList(startDate, endDate);
  }

  this.callbackChangeDatePicker = function(cbID, year, month, day, hour, minute) {
    var t = popObject(cbID);
    try {
      var dt = new Date(year, month, day, hour, minute);

      if(t.data("datevalue") == null || t.data("datevalue") == undefined || t.data("datevalue") == "") {
        t.data("datevalue", dt);
        window.view.setString("title", "End Date");
        window.view.showDateTimePicker("wafn.callbackChangeDatePicker", pushObject(t), dt.getFullYear(), dt.getMonth() + 1, dt.getDate(), dt.getHours(), dt.getMinutes(), 0);
      } else {
        wafn.getResevationList(t.data("datevalue"), dt);
        t.data("datevalue", null);
      }

    } finally {}
  }

  this.getResevationList = function(startDate, endDate) {
    $("#ja_display_period").val(startDate.getDateString() + " ~ " + endDate.getDateString());
    var reqData = {
      data: [{
        "SearchStartDate": getLocalDateFormatString(startDate),
        "SearchEndDate" : getLocalDateFormatString(endDate)
      }]
    }

    debug("onReservationSearchTypeChange request : " + JSON.stringify(reqData));

    // 요청
    $.ajax({
      type: "post",
      dataType: "wa",
      url: "/Appointment.asmx/ListForJobAllocation",
      needauth: true,
      data: reqData,
      waresponse: function(isSucc, data, responsecode, responsedata, responsemsg, statuscode, errmsg, errdesc) {
        debug("onReservationSearchTypeChange", isSucc, data, responsecode, responsedata, responsemsg);

        if (!isSucc || responsecode != 1 || responsedata == null || responsedata.length <= 0) {
          debug("onReservationSearchTypeChange", "FAIL", statuscode, errmsg, errdesc);
        } else {
          debug("khhr : " + JSON.stringify(responsedata));
          $('#customerListBox').append(wafn._reservationTemplate(responsedata));
          _bindEvents(null, "#customerListBox");
        }

      }
    });

  }

  this.onReservationListClk = function(e, $this) {
    e.preventDefault();

    $("#customerListBox li").removeClass("checked");
    $(".reservationSearchBox > input").val($this.data("plateno"));
    $this.addClass("checked");
    wafn._appointmentSeq = $this.data("appointmentseq");
    wafn.getRepairOrderList(wafn._appointmentSeq);
  }

  this.canQuit = function() {
    debug("canQuit");

    return true; //!modified;
  }

  this.quit = function() {
    wafn.unRegisterHelper();
    debug("quit");
  }

  this.initLayout = function() {
  	wafn.drawTimeTable(wafn._viewStartHour, wafn._viewEndHour);
  	wafn._timeTableLeftPadding = parseInt($(".timeTable ul > li").css("padding-left").replace('px', ''));

  	$('.TimeOver').on('scroll', function() {
  		$('.timeTable').scrollLeft($(this).scrollLeft());
  	});
  };

  this.drawTimeTable = function(startTime, endTime) {
  	$('.timeTable ul').empty();
  	for ( var i = startTime; i <= endTime; i++) {
  		var li = $("<li></li>");
  		$(li).text(i);
  		$('.timeTable ul').append(li);
  	}

  	var wwww = $(".timeTable ul").outerWidth();
  	$(".timeWrap").css("width", wwww);
  };

  this.initValue = function() {
  	var timeTableWidth = parseInt($("#ja_time_table ul").width() - (wafn._timeTableLeftPadding * 2));
  	wafn._oneHourWidth = parseInt(timeTableWidth / (wafn._viewEndHour - wafn._viewStartHour));
  	wafn._oneMinuteWidth = parseInt(wafn._oneHourWidth / 60);
  	wafn._minimumWidth = wafn._oneMinuteWidth * wafn._assignMinMinute;
  	wafn._leftOffset = $("#ja_time_over").offset().left;
  	wafn._intervalWidth = Math.floor(wafn._oneMinuteWidth * wafn._viewTimeInterval);
  };

  this.onReservationToggleBtn = function(c) {
    // if($(c).is("checked") == true)
  }

  this.onDatePrev = function(e, $this) {
    e.preventDefault();

    wafn.onChangeDate(null, "prev");
  }

  this.onDateNext = function(e, $this) {
    e.preventDefault();

    wafn.onChangeDate(null, "next");
  }

  this.initEditControler = function() {
  	var _isModified = true;
    $('.TimeOver').append(wafn._controlerTemplate());

    loadJS("jactrl.js", true, function() {
      wafn._jactrl = new JaCtrl();
    	wafn._jactrl.JaControler_init("ja_editControler", _isModified);
    	wafn._jactrl.JaControler_setLayoutValue(wafn._leftOffset, parseInt($(".timeTable ul").width()), wafn._timeTableLeftPadding, "ja_time_over", "controlBox");
    	wafn._jactrl.JaControler_setGlobalValue(wafn._minimumWidth, wafn._viewEndHour, wafn._viewStartHour, wafn._oneHourWidth, wafn._oneMinuteWidth, wafn._viewTimeInterval, wafn._assignDefaultMinute, wafn._assignMinMinute);
    	wafn._jactrl.JaControler_bindTouchEvent();
    });
  }

  this.unRegisterHelper = function() {
    Handlebars.unregisterHelper('jatargeteach');
    Handlebars.unregisterHelper('jajoblisteach');
    Handlebars.unregisterHelper('jajobdata');
    Handlebars.unregisterHelper('jatargetaddlineeach');
    Handlebars.unregisterHelper('wajabinddata_none');
    Handlebars.unregisterHelper('wajadateformat');
    Handlebars.unregisterHelper('wajajobstatuscode');
    Handlebars.unregisterHelper('wajadeallocatecancelenable');
  }

  this.registerHelper = function() {
  	Handlebars.registerHelper('jatargeteach', function(context, options) {
  		if (typeof context === 'undefined') {
  			return "";
  		}

  		var ret = "";
  		var data;

  		if (context !== null) {
  			if (options.data) {
  				data = Handlebars.createFrame(options.data);
  			}

  			for(var i = 0; i < context.length; i++) {
  				if (typeof context[i] !== "undefined" && context[i] !== null) {
  					if (data) {
  						data.index = i;
  						data.RowCount = context[i].JobList.length;
  						data.TargetTypeCode = context[i].TargetTypeCode;
  						data.TargetName = context[i].TargetName;
  						data.TargetID = context[i].TargetID;
  						data.BayEmployeeCount = context[i].BayEmployeeCount;
  					}

  					ret += options.fn(context[i], { data: data });
  				}
  			}
  		} else {
  			return "";
  		}

  		return ret;
  	});

  	Handlebars.registerHelper('jajoblisteach', function(context, options) {
  		if (typeof context === 'undefined') {
  			return "";
  		}

  		var ret = "";

  		var data;
  		if (context !== null) {
  			if (options.data) {
  				data = Handlebars.createFrame(options.data);
  			}

  			data.TargetName = context.TargetName;
  			data.TargetID = context.TargetID;
  			data.TargetTypeCode = context.TargetTypeCode;

  			for (key in context.JobList) {
  				data.index = key;
  				ret += options.fn(context.JobList[key], {
  					data: data
  				});
  			}
  		} else {
  			return "";
  		}

  		return ret;
  	});

  	Handlebars.registerHelper('jajobdata', function(context, fn) {
      var ret = "";

      if(typeof context === 'object') {
      	ret += JSON.stringify(context);
      }

  		return ret;
    });

  	Handlebars.registerHelper('jatargetaddlineeach', function(context, options) {
  		if (typeof context === 'undefined') {
  			return "";
  		}

  		var ret = "";
  		var data;

  		if (context !== null && context.length > 1) {
  			if (options.data) {
  				data = Handlebars.createFrame(options.data);
  			}

  			for(var i = 0; i < context.length - 1; i++) {
  				if (typeof context[i] !== "undefined" && context[i] !== null) {
  					ret += options.fn(context[i], { data: data });
  				}
  			}
  		} else {
  			return "";
  		}

  		return ret;
  	});

    Handlebars.registerHelper('wajabinddata_none', function(key, fn) {
      var ret = "";
      ret = '<script';
      ret += ' data-wa-bind-key="' + key + '" data-wa-bind-context="' + key + '"';
      ret += '></script>';

      return new Handlebars.SafeString(ret);
    });

    Handlebars.registerHelper('wajadateformat', function(date, time, options) {
      var dateTimeStr = "";
      if(date != undefined && time != undefined && options != undefined) {
        var dateTime = wafn.getDateTimeFromServerType(date, time);
        dateTimeStr = dateTime.getDateTimeString();
      } else if (date != undefined && options == undefined) {
        dateTimeStr = getDateTimeString(date);
      }

      return dateTimeStr;
    });

    Handlebars.registerHelper('wajajobstatuscode', function(jobstatuscode) {
      return new Handlebars.SafeString(wafn.rocode.getDisplayNameByJobStatusCode(jobstatuscode));
    });

    Handlebars.registerHelper('wajadeallocatecancelenable', function(jobstatuscode, isStartDelayChecked, bayTypeCode, options) {
      var isModified = null;
      switch(bayTypeCode) {
        case "01":
          isModified = wafn._ja_job_assign ? true : false;
        break;
        case "02":
          isModified = wafn._ja_fi_assign ? true : false;
        break;
        case "03":
          isModified = wafn._ja_washing_assign ? true : false;
        break;
      }

      if (isModified) {
        switch (jobstatuscode) {
    			case "J00":
            return options.inverse(this);
    				break;
          case "J06":
            if (isStartDelayChecked == true) {
              return options.inverse(this);
            } else {
              return options.fn(this);
            }
            break;
    			case "J01":
          case "J02":
          case "J03":
          case "J05":
    			case "J07":
          default:
            return options.fn(this);
    				break;
  		  }
      } else {
        return options.fn(this);
      }
    });

    Handlebars.registerHelper('jaappointmentdate', function(date) {
      var dateTimeStr = "";
      if(date != undefined) {
        var dateTime = wafn.getDateTimeFromServerType(date);
        dateTimeStr = dateTime.getDateString();
      }

      return dateTimeStr;
    });

  }

  this.getRepairOrderList = function(AppointmentSeq) {
    var reqData = {
      data: [{
        "AppointmentSeq": AppointmentSeq
      }]
    }

		debug("getRepairOrderList request : " + JSON.stringify(reqData));

		// 요청
		$.ajax({
			type: "post",
			dataType: "wa",
			url: "/WorkOrder_new.asmx/View",
			needauth: true,
			data: reqData,
			waresponse: function(isSucc, data, responsecode, responsedata, responsemsg, statuscode, errmsg, errdesc) {
				debug("getRepairOrderList", isSucc, data, responsecode, responsedata, responsemsg);
				if (!isSucc || responsecode != 1 || responsedata == null || responsedata.length <= 0) {
					debug("getRepairOrderList", "FAIL", statuscode, errmsg, errdesc);
          $(".orderSelect > input").val("No Data");
          $(".orderSelect > .icon_order").attr("disabled", "disabled");
				} else {
          var PlateNo = responsedata[0].PlateNo;
          var RepairOrderSeq = responsedata[0].RepairOrder[0].RepairOrderSeq;
          var DMS_RO_Code = responsedata[0].RepairOrder[0].DMS_RO_Code;
          var LTS_Minutes = responsedata[0].RepairOrder[0].LTS_Minutes;
          $(".orderSelect > input").val(DMS_RO_Code);
          $(".orderSelect > input").data("plateno", PlateNo);
          $(".orderSelect > input").data("repairorderseq", RepairOrderSeq);
          $(".orderSelect > input").data("ltsminutes", LTS_Minutes);
          $(".orderSelect > .icon_order").removeAttr("disabled");

          if((responsedata[0].RepairOrder[0].JobScheduleDataList != null && responsedata[0].RepairOrder[0].JobScheduleDataList.length > 0)
            && (wafn._ja_job_assign || wafn._ja_fi_assign || wafn._ja_washing_assign)) {
            $(".orderWrap .icon_deallocate").removeAttr("disabled");
          } else {
            $(".orderWrap .icon_deallocate").attr("disabled", "disabled");
          }

          if(wafn._jactrl != null)
            wafn._jactrl.JaControler_onXBtnEvt();

				}

			}
		});
  }

  this.onTodayBtnEvt = function() {
  	var today = new Date();
  	today.setHours(0, 0, 0, 0);
  	wafn._selectedDate = today;

  	wafn.onChangeDate(null, "today");
  };

  this.onChangeDate = function(obj, data) {
    setTimeout(function() {
			$('#ja_time_over').stop().animate({
				scrollLeft : 1
			}, "fast");
		}, 100);
  	switch (data) {
  		case "prev":
      	wafn._selectedDate.setDate(wafn._selectedDate.getDate() - 1);
  			break;
  		case "next":
      	wafn._selectedDate.setDate(wafn._selectedDate.getDate() + 1);
  			break;
  		default:
  			break;
  	}

  	$('#ja_selected_date').html(wafn._selectedDate.getDateString());
  	var todayDate = new Date();
  	if (wafn._selectedDate.getFullYear() != todayDate.getFullYear() || wafn._selectedDate.getMonth() != todayDate.getMonth() || wafn._selectedDate.getDate() != todayDate.getDate()) {
  		$('.presentTime').hide();
      wafn.refleshCurrentTimeOver(false);
  	} else if (todayDate.getHours() < wafn._viewStartHour || todayDate.getHours() > wafn._viewEndHour) {
  		$('.presentTime').hide();
  	} else {
  		$('.presentTime').show();

  		wafn.reflashCurrentTimeBar();
  		wafn.refleshCurrentTimeOver(true);
  	}
  	wafn.getTargetList();
  }

  this.reflashCurrentTimeBar = function() {
  	var today = new Date();
  	$('#ja_time_text').html(today.getTimeShortString());
  	var h = today.getHours();
  	var m = today.getMinutes();

  	var left = ((h - wafn._viewStartHour) * parseInt(wafn._oneHourWidth)) + (m * parseInt(wafn._oneMinuteWidth));
  	$('.presentTime').css('left', left);
  };

  this.refleshCurrentTimeOver = function(isToday) {
  	var locationPosition = null;

    if (isToday == true) {
      var scrollLeft = $("#ja_time_over").scrollLeft();
      if (wafn._leftOffset >= $('.presentTime').offset().left || (wafn._oneHourWidth + wafn._timeTableLeftPadding) < $(".presentTime").offset().left - wafn._leftOffset) {
        locationPosition = $("#ja_time_over").scrollLeft() - (wafn._leftOffset - $('.presentTime').offset().left) - wafn._oneHourWidth + wafn._timeTableLeftPadding;
      } else {
        return;
      }      
    } else {
      locationPosition = wafn._oneHourWidth * 8;
    }
    
  	
    setTimeout(function() {
  		$('#ja_time_over').stop().animate({
  			scrollLeft : locationPosition
  		}, 500);
  	}, 1000);
  };

  this.getTargetList = function() {
  	$('.techNameArea > ul').empty();
  	$('.timeWrap > ul').empty();
  	$('.searchTopArea > .step span > span').text(0);
    if(wafn._jactrl != null)
      wafn._jactrl.JaControler_onXBtnEvt();

    var reqData = {
      data: [{}]
    }
		debug("getTargetList request : " + JSON.stringify(reqData));

		$.ajax({
			type: "post",
			dataType: "wa",
			url: "/EmployeeInfo.asmx/ListBayTechnician",
			needauth: true,
			data: reqData,
			waresponse: function(isSucc, data, responsecode, responsedata, responsemsg, statuscode, errmsg, errdesc) {
				debug("getTargetList", isSucc, data, responsecode, responsedata, responsemsg);
				if (!isSucc || responsecode != 1 || responsedata == null || responsedata.length <= 0) {
					debug("getTargetList", "FAIL", statuscode, errmsg, errdesc);
				} else {
          wafn.getJobScheduleList(responsedata);
				}
			}
		});
  };

  this.getJobScheduleList = function(targetList) {
    var reqData = {
      data: [{
        "RepairOrderDate" : getLocalDateFormatString(wafn._selectedDate)
      }]
    }
		debug("getJobScheduleList request : " + JSON.stringify(reqData));

		$.ajax({
			type: "post",
			dataType: "wa",
			url: "/WorkOrder_New.asmx/ListBayJS",
			needauth: true,
			data: reqData,
			waresponse: function(isSucc, data, responsecode, responsedata, responsemsg, statuscode, errmsg, errdesc) {
				debug("getJobScheduleList", isSucc, data, responsecode, responsedata, responsemsg);
				if (!isSucc || responsecode != 1 || responsedata == null || responsedata.length <= 0) {
					debug("getJobScheduleList", "FAIL", statuscode, errmsg, errdesc);
				}

        var technicianJobscheduleItems = new Array();
        $.each(targetList, function() {
          var jobList = [];
          var targetItem = {
            "TargetID" : this.BaySeq,
            "TargetName" : this.BayName,
            "TargetTypeCode" : this.BayTypeCode,
            "BayEmployeeCount" : this.BayEmployeeCount,
            "JobList" : jobList
          };
          if (responsedata != null && responsedata.length > 0) {
            $.each(responsedata, function() {
              if (targetItem.TargetID == this.BaySeq) {
                wafn.overlapCheckJobTime(targetItem.JobList, this);
              }
            });
          }
          if (targetItem.JobList.length <= 0) {
            var jobListChild = new Array();
            targetItem.JobList.push(jobListChild);
          }
          technicianJobscheduleItems.push(targetItem);
        });
        debug("khhj : " + JSON.stringify(technicianJobscheduleItems));

        $('.techNameArea > ul').html(wafn._targetTemplate(technicianJobscheduleItems));
        $('.timeWrap > ul').append(wafn._inputScheduleTemplate(technicianJobscheduleItems));
        $('.timeWrap > ul li .LineAreaJob').on("touchstart", wafn.onInputScheduleTouchStart);
        $('.timeWrap > ul li .LineAreaJob').on("touchend", wafn.onInputScheduleTouchEnd);
        wafn.countTopStepCount();
			}
		});
  }

  this.overlapCheckJobTime = function(jobList, jobItem) {
  	if (jobList == null)
  		return;

  	wafn.designJobItem(jobItem);
  	if (jobList.length <= 0) {
  		var jobListChild = new Array();
  		jobListChild.push(jobItem);
  		jobList.push(jobListChild);

  		return;
  	} else {
      var dateStart = wafn.getDateTimeFromServerType(jobItem.JobScheduleStartDate, jobItem.JobScheduleStartTime);
      var dateEnd = wafn.getDateTimeFromServerType(jobItem.JobScheduleEndDate, jobItem.JobScheduleEndTime);
  		for ( var j = 0; j < jobList.length; j++) {
  			var jobListChild = jobList[j];
  			var overlapIndex = 0;
  			for ( var i = 0; i < jobListChild.length; i++) {
          var prevDateStart = wafn.getDateTimeFromServerType(jobListChild[i].JobScheduleStartDate, jobListChild[i].JobScheduleStartTime);
          var prevDateEnd = wafn.getDateTimeFromServerType(jobListChild[i].JobScheduleEndDate, jobListChild[i].JobScheduleEndTime);
  				if (dateEnd <= prevDateEnd) {
  					if (dateEnd > prevDateStart) {
  						overlapIndex = i + 1;
  					}
  				}

  				if (dateStart < prevDateEnd) {
  					if (dateStart >= prevDateStart) {
  						overlapIndex = i + 1;
  					} else {
  						if (dateEnd > prevDateStart) {
  							overlapIndex = i + 1;
  						}
  					}
  				}
  			}

  			if (overlapIndex == 0) {
  				jobListChild.push(jobItem);
  				break;
  			} else if ((jobList.length - 1) == j) {
  				var jobListChild = new Array();
  				jobListChild.push(jobItem);
  				jobList.push(jobListChild);
  				break;
  			}
  		}
  	}
  };

  this.designJobItem = function(jobItem) {
  	var leftPoint = 0;
  	var width = 0;
  	var AllocationType = jobItem.AllocationType;
  	var PlateNo = jobItem.PlateNo;
  	var WorkTypeCode = jobItem.WorkTypeCode;
    var PassYN = jobItem.PassYN;
    var colorClass = "";

  	var dateStart = wafn.getDateTimeFromServerType(jobItem.JobScheduleStartDate, jobItem.JobScheduleStartTime);
  	var isStartPrevDay = wafn.checkOtherDayToSelectedDay(dateStart);
  	var dateEnd = wafn.getDateTimeFromServerType(jobItem.JobScheduleEndDate, jobItem.JobScheduleEndTime);
  	var isEndAfterDay = wafn.checkOtherDayToSelectedDay(dateEnd);

  	var startHour = (dateStart.getHours() - wafn._viewStartHour);
  	leftPoint = Math.floor((startHour * wafn._oneHourWidth) + (Math.floor((dateStart.getMinutes() / wafn._viewTimeInterval)) * wafn._intervalWidth)) + wafn._timeTableLeftPadding;
  	if (startHour < wafn._viewStartHour || isStartPrevDay == true)
  		leftPoint = wafn._timeTableLeftPadding;

  	var endHour = dateEnd.getHours() - (isStartPrevDay == true ? wafn._viewStartHour : dateStart.getHours());
  	var hourWidth = Math.floor(endHour * wafn._oneHourWidth);
  	var minuteWidth = Math.floor(dateEnd.getMinutes() / wafn._viewTimeInterval) * wafn._intervalWidth - (isStartPrevDay == true ? 0 : Math.floor(dateStart.getMinutes() / wafn._viewTimeInterval) * wafn._intervalWidth);
  	width = hourWidth + minuteWidth;
  	if (isEndAfterDay == true || dateEnd.getHours() >= wafn._viewEndHour)
  		width = ((wafn._viewEndHour - wafn._viewStartHour) * wafn._oneHourWidth) + wafn._timeTableLeftPadding - leftPoint;

    if (PassYN == "N") {
      colorClass = "step_passX";
    } else {
      colorClass = "step_" + jobItem.JobStatusCode;
    }

  	jobItem.left = leftPoint;
  	jobItem.width = width;
  	jobItem.colorClass = colorClass;
  	jobItem.workTypeCode = WorkTypeCode;
  	jobItem.MoreThan1Day = (isStartPrevDay == true || isEndAfterDay == true) ? true : false;
  };

  this.checkOtherDayToSelectedDay = function(date) {
  	return (new Date(wafn._selectedDate.getFullYear(), parseInt(wafn._selectedDate.getMonth()), wafn._selectedDate.getDate(), 0, 0) - new Date(date.getFullYear(), parseInt(date.getMonth()), date.getDate(), 0, 0) != 0);
  };

  this.countTopStepCount = function() {
  	$("#count_step_J00").text($(".step_J00", ".timeWrap li").length);
    $("#count_step_J01").text($(".step_J01, .step_J02, .step_J03, .step_J05", ".timeWrap li").length);
  	$("#count_step_J06").text($(".step_J06", ".timeWrap li").length);
  	$("#count_step_J04").text($(".step_J04", ".timeWrap li").length);
  };

  this.onInputScheduleTouchStart = function(e) {
  	var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
  	var touchX = touch.clientX;
    wafn._startX = touch.clientX;
    wafn._startY = touch.clientY;
  }

  this.onInputScheduleTouchEnd = function(e) {
    e.preventDefault();

  	var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
  	var touchX = touch.clientX;
    var touchY = touch.clientY;

    if (Math.abs(wafn._startX - touchX) > 10 || Math.abs(wafn._startY - touchY) > 10)
      return;

  	var bScheduleExist = false;
  	$(this).children("div").each(function() {
  		var left = $(this).offset().left;
  		var right = left + $(this).outerWidth();
  		if (touchX >= left && touchX <= right) {
  			bScheduleExist = true;
  			wafn.showTimeEditCtrl($(this), e, bScheduleExist);
  			return false;
  		}
  	});

    if (bScheduleExist == false) {
			wafn.showTimeEditCtrl($(this), e, bScheduleExist);
		}
  }

  this.showTimeEditCtrl = function(obj, e, bScheduleExist) {
  	var width = null;
  	var scrollLeft = $("#ja_time_over").scrollLeft();
  	var left = 0;
  	var lowIndex = 0;
  	var parentElem = null;

  	if (bScheduleExist == false) {
      if (wafn._hidedScheduleObj != null) {
        var PassYN = wafn._hidedScheduleObj.data("jobvalue").PassYN;
        if (PassYN == "N")
          return;

        var JobStatusCode = wafn._hidedScheduleObj.data("jobvalue").JobStatusCode;
        var IsStartDelayChecked = wafn._hidedScheduleObj.data("jobvalue").IsStartDelayChecked;
        if (JobStatusCode != "J00" && !(JobStatusCode == "J06" && IsStartDelayChecked == true))
          return;
      } else {
        var RepairOrderSeq = $(".orderSelect > input").data("repairorderseq");
    		if (RepairOrderSeq == null || RepairOrderSeq == undefined) {
    			return;
    		}
      }

      if (wafn._jactrl.JaControler_getWidth() != 0) {
        width = wafn._jactrl.JaControler_getWidth();
      } else {
       width = $(".orderSelect > input").data("ltsminutes") * wafn._oneMinuteWidth;
      }
      var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
  		left = (touch.clientX - wafn._leftOffset) - width / 2 + scrollLeft;
  		parentElem = obj;
  	} else {
  		wafn.showHiddenScheduleObj();

  		parentElem = obj.parent();
  		width = obj.outerWidth();
  		left = obj.offset().left - wafn._leftOffset + scrollLeft;

  		wafn._selectedJob = obj.data("jobvalue");

  		obj.addClass("displayNone");
  		wafn._hidedScheduleObj = obj;
  	}

  	if (left < 0)
  		left = wafn._timeTableLeftPadding;

    var targetId = parentElem.data("targetid");
    var targetName = parentElem.data("targetname");
    var TargetTypeCode = parentElem.data("targetgroupcode");
  	var top = (parentElem.offset().top - $(".TimeOver").offset().top + 1);
  	var MoreThan1Day = (wafn._hidedScheduleObj != null && (wafn._hidedScheduleObj.data("jobvalue").MoreThan1Day == true)) ? true : false;
    var isModified = null;

    switch(TargetTypeCode) {
      case "01":
        isModified = wafn._ja_job_assign;
      break;
      case "02":
        isModified = wafn._ja_fi_assign;
      break;
      case "03":
        isModified = wafn._ja_washing_assign;
      break;
    }

    wafn._jactrl.JaControler_setWidth(width);
    wafn._jactrl.JaControler_setAuth(isModified);
    wafn._jactrl.JaControler_setSize(left, top, width);
  	wafn._jactrl.JaControler_setStartBarFirstTouchX(left);
    wafn._jactrl.JaControler_setTargetData(targetId, targetName);
    wafn._jactrl.JaControler_setStatusCode();
    wafn._jactrl.JaControler_showEditControler();
  	wafn._jactrl.JaControler_reArrangeBubbleBox();
  	wafn.makeEditControlerTime();
  };

  this.showHiddenScheduleObj = function() {
  	if (wafn._hidedScheduleObj != null) {
  		wafn._hidedScheduleObj.removeClass("displayNone");
  		wafn._hidedScheduleObj = null;
  	}
  };

  this.getDateTimeFromServerType = function(d, t) {
		try {
      if (d != undefined && t != undefined) {
			  var ds = d.split("-");
   			var ts = t.split(":");

        if (ds.length >= 3 && ts.length >= 2)
         return (new Date(ds[0], Number(ds[1]) - 1, ds[2], ts[0], ts[1]));
      } else if (d != undefined && t == undefined) {
			  var ds = d.split("-");

        if (ds.length >= 3)
				  return (new Date(ds[0], Number(ds[1]) - 1, ds[2], 0, 0));

      }
		} catch (err) {
		}
		return null;
	};

  this.onDeallocateBtnEvt = function(e, $this) {
    if(e != null)
      e.preventDefault();

    loadJS("rocode.js", true, function() {
      wafn.rocode = new ROCODE();
    });

    $("#deallocatePopup").removeClass("displayNone");
    var reqData = {
      data: [{
        RepairOrderSeq : $(".orderSelect > input").data("repairorderseq")
      }]
    }
		debug("ListRO_BayJS request : " + JSON.stringify(reqData));

		$.ajax({
			type: "post",
			dataType: "wa",
			url: "/WorkOrder_New.asmx/ListRO_BayJS",
			needauth: true,
			data: reqData,
			waresponse: function(isSucc, data, responsecode, responsedata, responsemsg, statuscode, errmsg, errdesc) {
				debug("ListRO_BayJS", isSucc, data, responsecode, responsedata, responsemsg);
				if (!isSucc || responsecode != 1) {
					debug("ListRO_BayJS", "FAIL", statuscode, errmsg, errdesc);
				} else {
          debug("khhd : " + JSON.stringify(responsedata));
          $("#deallocatePopup table tbody").html(wafn._deallocateTemplate(responsedata));
          _bindEvents(null, "#deallocatePopup");
				}
			}
		});
  }

  this.onDeallocateCancelBtn = function(e, $this) {
    e.preventDefault();

    var reqData = {
      data: [
    			   _getWAJsonData($this.parent())
           ]
    }
		debug("DeleteBaySchedule request : " + JSON.stringify(reqData));

		$.ajax({
			type: "post",
			dataType: "wa",
			url: "/WorkOrder_New.asmx/DeleteBaySchedule",
			needauth: true,
			data: reqData,
			waresponse: function(isSucc, data, responsecode, responsedata, responsemsg, statuscode, errmsg, errdesc) {
				debug("DeleteBaySchedule", isSucc, data, responsecode, responsedata, responsemsg);
				if (!isSucc || responsecode != 1) {
					debug("DeleteBaySchedule", "FAIL", statuscode, errmsg, errdesc);
          toastr.warning("Process has been failed."+ "("  + responsecode + ")");
				} else {
          toastr.info("Process has been completed.");
          wafn.onDeallocateBtnEvt();
				}
			}
		});
  }

  this.onRoPopupClose = function(e, $this) {
    e.preventDefault();

    $("#roPopup").addClass("displayNone");

    if (wafn._isRoEdit == true) {
      wafn.getTargetList();
      wafn._isRoEdit = false;
    }
  }

  this.onDeallocatePopupClose = function(e, $this) {
    e.preventDefault();

    $("#deallocatePopup").addClass("displayNone");

    wafn.getTargetList();
  }









  /* jactrl btn evt start -------------->*/

  this.onCloseBtn = function() {
    wafn._selectedJob = null;
    wafn.showHiddenScheduleObj();
  }

  this.onConfirmBtn = function() {
    var reqData = null;
    var reqUrl = null;
    var waJsonData = _getWAJsonData(wafn._jactrl.JaControler_getJaControler());

    if (wafn._hidedScheduleObj == null) {
      reqUrl = "/WorkOrder_New.asmx/BayJS_Regist";
    	delete waJsonData.JobScheduleSeq;
    	delete waJsonData.BayJobScheduleSeq;
    	delete waJsonData.BaySeq_Old;
    } else {
			var jobValue = wafn._hidedScheduleObj.data("jobvalue");
			var BaySeq = jobValue.BaySeq;
      if(wafn._jactrl.JaControler_getTargetData().targetId != BaySeq) {
        reqUrl = "/WorkOrder_New.asmx/BayJS_RegistForNewBay";
      } else {
        reqUrl = "/WorkOrder_New.asmx/UpdateBaySchedule";
      	delete waJsonData.BaySeq_Old;
      }
    }

    reqData = {
      data: [
        waJsonData
      ]
    }
		debug("onConfirmBtn request : " + JSON.stringify(reqData));

		$.ajax({
			type: "post",
			dataType: "wa",
			url: reqUrl,
			needauth: true,
			data: reqData,
			waresponse: function(isSucc, data, responsecode, responsedata, responsemsg, statuscode, errmsg, errdesc) {
				debug("onConfirmBtn", isSucc, data, responsecode, responsedata, responsemsg);
				if (!isSucc || responsecode != 1) {
					debug("onConfirmBtn", "FAIL", statuscode, errmsg, errdesc);
          displayResponseMessage(responsecode);
				} else {
          toastr.info("Process has been completed.");
          wafn._jactrl.JaControler_onXBtnEvt();
          wafn.getTargetList();
				}
			}
		});
  }

  this.onScheduleBtn = function($this) {
    var today = new Date();
    window.view.setString("title", "Start Date");
    $this.data("ISSTART", "Y");
    window.view.showDateTimePicker("wafn.callbackScheduleDatePicker", pushObject($this), today.getFullYear(), today.getMonth() + 1, today.getDate(), today.getHours(), today.getMinutes(), 2);
  }

  this.callbackScheduleDatePicker = function(cbID, year, month, day, hour, minute) {
    var t = popObject(cbID);
    try {
      if (t.data("ISSTART") == "Y") {
        t.data("datevalue", null);
        t.data("ISSTART", "N");
      }
      var dt = new Date(year, month, day, hour, minute);
      if(t.data("datevalue") == null || t.data("datevalue") == undefined || t.data("datevalue") == "") {
        t.data("datevalue", dt);
        window.view.setString("title", "End Date");
        window.view.showDateTimePicker("wafn.callbackScheduleDatePicker", pushObject(t), dt.getFullYear(), dt.getMonth() + 1, dt.getDate(), dt.getHours(), dt.getMinutes(), 2);
      } else {

  			$(".editBubbleStartDate", wafn._jactrl.JaControler_getJaControler()).data("wavalue", getLocalDateFormatString(t.data("datevalue")));
  			$(".editBubbleStart", wafn._jactrl.JaControler_getJaControler()).data("wavalue", t.data("datevalue").getDateFormat(g_timeshortformat));
        $(".editBubbleEndDate", wafn._jactrl.JaControler_getJaControler()).data("wavalue", getLocalDateFormatString(dt));
        $(".editBubbleEnd", wafn._jactrl.JaControler_getJaControler()).data("wavalue", dt.getDateFormat(g_timeshortformat));

        t.data("datevalue", null);

        wafn.onConfirmBtn();
      }

    } finally {}
  }

  this.onDetailBtn = function(e, $this) {
    var appointmentSeq = null;
    var repairOrderSeq = null;

    if(e && $this) {
      e.preventDefault();

      appointmentSeq = wafn._appointmentSeq;
      repairOrderSeq = $(".orderSelect > input").data("repairorderseq");
    } else if (wafn._hidedScheduleObj != null) {
      var jobValue = wafn._hidedScheduleObj.data("jobvalue");

      appointmentSeq = jobValue.AppointmentSeq;
      repairOrderSeq = jobValue.RepairOrderSeq;
    } else {
      appointmentSeq = wafn._appointmentSeq;
      repairOrderSeq = $(".orderSelect > input").data("repairorderseq");
    }

    if (appointmentSeq != null && repairOrderSeq != null) {
      $("#roPopup").removeClass("displayNone");
      $("#roPopup .popupContent").load("rosub.html #rosubBody", function() {

        loadJS("rosub.js", true, function() {
          var data = {
            type: "JA",
            appseq: appointmentSeq,
            roseq: repairOrderSeq
          }
          wafn.rosub = new ROSUB(data);
          wafn.rosub.initRoSub();
          wafn.rosub.setJaCallback(wafn.onRoSubCallback);
        });

        loadJS("rocode.js", true, function() {
          wafn.rocode = new ROCODE();
        });
      });
    }

  }

  this.onRoSubCallback = function(roedit) {
    wafn._isRoEdit = roedit;
  }

  this.onRemoveBtn = function() {
    var waJsonData = _getWAJsonData(wafn._jactrl.JaControler_getJaControler());
  	delete waJsonData.BayName;
  	delete waJsonData.JobScheduleStartDate;
  	delete waJsonData.JobScheduleStartTime;
  	delete waJsonData.JobScheduleEndDate;
  	delete waJsonData.JobScheduleEndTime;
  	delete waJsonData.JobScheduleSeq;

    var reqData = {
      data: [
        waJsonData
      ]
    }
		debug("onRemoveBtnCallBack request : " + JSON.stringify(reqData));

		$.ajax({
			type: "post",
			dataType: "wa",
			url: "/WorkOrder_New.asmx/UpdateBayScheduleStatus_Removed",
			needauth: true,
			data: reqData,
			waresponse: function(isSucc, data, responsecode, responsedata, responsemsg, statuscode, errmsg, errdesc) {
				debug("onRemoveBtnCallBack", isSucc, data, responsecode, responsedata, responsemsg);
				if (!isSucc || responsecode != 1) {
					debug("onRemoveBtnCallBack", "FAIL", statuscode, errmsg, errdesc);
          displayResponseMessage(responsecode);
				} else {
          toastr.info("Process has been completed.");
          wafn.getTargetList();
				}
			}
		});
  }

  this.onDeallocateBtn = function() {
    var reqData = {
      data: [
        _getWAJsonData(wafn._jactrl.JaControler_getJaControler())
      ]
    }
		debug("onDeallocateBtn request : " + JSON.stringify(reqData));

		$.ajax({
			type: "post",
			dataType: "wa",
			url: "/WorkOrder_New.asmx/DeleteBaySchedule",
			needauth: true,
			data: reqData,
			waresponse: function(isSucc, data, responsecode, responsedata, responsemsg, statuscode, errmsg, errdesc) {
				debug("onDeallocateBtn", isSucc, data, responsecode, responsedata, responsemsg);
				if (!isSucc || responsecode != 1) {
					debug("onDeallocateBtn", "FAIL", statuscode, errmsg, errdesc);
          displayResponseMessage(responsecode);
				} else {
          toastr.info("Process has been completed.");
          wafn.getTargetList();
				}
			}
		});
  }

  this.onFiMoveBtn = function() {
    if (wafn._hidedScheduleObj != null) {
      var jobValue = wafn._hidedScheduleObj.data("jobvalue");
      setAppointmentSeq(jobValue.AppointmentSeq);
      _loadMenu("fi");
    }

  }

  this.onWashingBtn = function() {
    if (wafn._hidedScheduleObj != null) {
      var jobValue = wafn._hidedScheduleObj.data("jobvalue");
      setAppointmentSeq(jobValue.AppointmentSeq);
      fistarttab = "washing";
      _loadMenu("fi");
    }
  }

  this.makeEditControlerTime = function() {
  	var timeTxtS = null;
  	var timeTxtE = null;

  	if(wafn._hidedScheduleObj != null && (wafn._hidedScheduleObj.data("jobvalue").MoreThan1Day == true)) {
      var jobItem = wafn._hidedScheduleObj.data("jobvalue");
      var dateStart = wafn.getDateTimeFromServerType(jobItem.JobScheduleStartDate, jobItem.JobScheduleStartTime);
      var dateEnd = wafn.getDateTimeFromServerType(jobItem.JobScheduleEndDate, jobItem.JobScheduleEndTime);

  		timeTxtS = dateStart.getDateTimeString();
  		timeTxtE = dateEnd.getDateTimeString();
  	}

  	wafn._jactrl.JaControler_displayTimeAndInfo(timeTxtS, timeTxtE);
  };

  /* <-------------- jactrl btn evt end*/

}
